const roleAuth = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.user?.role || req.user?.role;
        
      if (!userRole) {
        return res.status(401).json({ message: "Unauthorized. No role found." });
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          message: "Access denied. You do not have permission for this resource." 
        });
      }

      next();
    } catch (error) {
      console.error("Role auth error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };
};

module.exports = roleAuth;
