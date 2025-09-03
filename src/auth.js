// Role definitions with hierarchical permissions
export const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
  GUEST: 'guest'
};

// Permission hierarchy (higher roles inherit lower role permissions)
export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER, ROLES.GUEST],
  [ROLES.OPERATOR]: [ROLES.OPERATOR, ROLES.VIEWER, ROLES.GUEST],
  [ROLES.VIEWER]: [ROLES.VIEWER, ROLES.GUEST],
  [ROLES.GUEST]: [ROLES.GUEST]
};

// Route-specific permissions mapping
export const ROUTE_PERMISSIONS = {
  // Admin-only routes
  'POST:/api/admin/.*': [ROLES.ADMIN],
  'DELETE:/api/.*': [ROLES.ADMIN],
  'PUT:/api/settings/.*': [ROLES.ADMIN],
  'POST:/api/agent/modify': [ROLES.ADMIN, ROLES.OPERATOR],
  'POST:/api/agent/create': [ROLES.ADMIN, ROLES.OPERATOR],
  
  // Operator routes (can modify but not admin functions)
  'POST:/api/agent/analyze': [ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER],
  'POST:/api/agent/search': [ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER],
  'POST:/api/agent/explain': [ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER],
  'POST:/api/chains/.*': [ROLES.ADMIN, ROLES.OPERATOR],
  'POST:/api/web/.*': [ROLES.ADMIN, ROLES.OPERATOR],
  
  // Viewer routes (read-only)
  'GET:/api/.*': [ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER],
  
  // Public routes (no auth required)
  'GET:/api/health': [ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER, ROLES.GUEST],
  'GET:/api/status': [ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER, ROLES.GUEST]
};

/**
 * Enhanced authentication middleware that supports multiple auth methods
 */
export async function installAuth(app) {
  // Check if authentication is disabled
  if (process.env.DISABLE_AUTH === 'true') {
    console.log('Authentication disabled - all users granted admin access');
    app.use('/api', (req, res, next) => {
      req.user = {
        id: 'disabled-auth-admin',
        role: ROLES.ADMIN,
        roles: [ROLES.ADMIN],
        permissions: ROLE_HIERARCHY[ROLES.ADMIN],
        authMethod: 'disabled'
      };
      next();
    });
    return true;
  }
  
  let joseEnabled = false;
  
  // Try to set up OIDC authentication
  try {
    const { default: jose } = await import('jose');
    const issuer = process.env.OIDC_ISSUER;
    const clientId = process.env.OIDC_CLIENT_ID;
    
    if (issuer && clientId) {
      const jwks = jose.createRemoteJWKSet(new URL(issuer.replace(/\/?$/, '/') + '.well-known/jwks.json'));
      
      app.use('/api', async (req, res, next) => {
        try {
          const auth = req.headers.authorization || '';
          if (!auth.startsWith('Bearer ')) return next();
          
          const token = auth.slice(7);
          const { payload } = await jose.jwtVerify(token, jwks, {
            issuer,
            audience: clientId
          });
          
          req.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role || payload.roles?.[0] || ROLES.GUEST,
            roles: payload.roles || [payload.role || ROLES.GUEST],
            permissions: ROLE_HIERARCHY[payload.role || ROLES.GUEST] || [ROLES.GUEST],
            authMethod: 'oidc'
          };
          
          next();
        } catch (error) {
          return res.status(401).json({ 
            error: 'Invalid token', 
            details: process.env.NODE_ENV === 'development' ? error.message : undefined 
          });
        }
      });
      
      joseEnabled = true;
    }
  } catch (error) {
    console.warn('OIDC authentication not available:', error.message);
  }
  
  // API Key authentication fallback
  const apiKey = process.env.AGENT_API_KEY;
  const adminApiKey = process.env.ADMIN_API_KEY;
  
  if (apiKey || adminApiKey) {
    app.use('/api', (req, res, next) => {
      // Skip if already authenticated via OIDC
      if (req.user) return next();
      
      const providedKey = req.header('x-api-key') || req.query.api_key;
      
      if (!providedKey) {
        // No API key provided - set as guest user if no OIDC
        if (!joseEnabled) {
          req.user = {
            id: 'guest',
            role: ROLES.GUEST,
            roles: [ROLES.GUEST],
            permissions: ROLE_HIERARCHY[ROLES.GUEST],
            authMethod: 'none'
          };
        }
        return next();
      }
      
      let userRole = ROLES.GUEST;
      let userId = 'api-user';
      
      if (adminApiKey && providedKey === adminApiKey) {
        userRole = ROLES.ADMIN;
        userId = 'admin-api';
      } else if (apiKey && providedKey === apiKey) {
        userRole = ROLES.OPERATOR;
        userId = 'operator-api';
      } else {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      req.user = {
        id: userId,
        role: userRole,
        roles: [userRole],
        permissions: ROLE_HIERARCHY[userRole],
        authMethod: 'api-key'
      };
      
      next();
    });
  }
  
  return joseEnabled || apiKey || adminApiKey;
}

/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // If no roles specified, allow anyone
    if (allowedRoles.length === 0) return next();
    
    // Get user role
    const userRole = req.user?.role || ROLES.GUEST;
    const userPermissions = req.user?.permissions || ROLE_HIERARCHY[ROLES.GUEST];
    
    // Check if user has any of the allowed roles through hierarchy
    const hasPermission = allowedRoles.some(role => userPermissions.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `Required role: ${allowedRoles.join(' or ')}, current role: ${userRole}`
      });
    }
    
    next();
  };
}

/**
 * Route-based permission middleware that automatically checks permissions
 * based on the route pattern and HTTP method
 */
export function requirePermission() {
  return (req, res, next) => {
    const routePattern = `${req.method}:${req.path}`;
    const userRole = req.user?.role || ROLES.GUEST;
    const userPermissions = req.user?.permissions || ROLE_HIERARCHY[ROLES.GUEST];
    
    // Find matching permission rule
    let requiredRoles = null;
    for (const [pattern, roles] of Object.entries(ROUTE_PERMISSIONS)) {
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(routePattern)) {
        requiredRoles = roles;
        break;
      }
    }
    
    // If no specific rule found, default based on method
    if (!requiredRoles) {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        requiredRoles = [ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER];
      } else {
        requiredRoles = [ROLES.ADMIN, ROLES.OPERATOR];
      }
    }
    
    // Check if user has required permissions
    const hasPermission = requiredRoles.some(role => userPermissions.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Route ${routePattern} requires: ${requiredRoles.join(' or ')}, current role: ${userRole}`
      });
    }
    
    next();
  };
}

/**
 * Middleware to require authentication (any valid user)
 */
export function requireAuth() {
  return (req, res, next) => {
    if (!req.user || req.user.role === ROLES.GUEST) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide valid credentials'
      });
    }
    next();
  };
}

/**
 * Get current user information
 */
export function getCurrentUser(req) {
  return req.user || {
    id: 'anonymous',
    role: ROLES.GUEST,
    roles: [ROLES.GUEST],
    permissions: ROLE_HIERARCHY[ROLES.GUEST],
    authMethod: 'none'
  };
}

