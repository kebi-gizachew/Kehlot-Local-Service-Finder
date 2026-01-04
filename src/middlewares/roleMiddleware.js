const requireAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

const requirePasswordChange = (req, res, next) => {
  if (req.user.mustChangePassword) {
    return res
      .status(403)
      .json({ message: "Password change required" });
  }
  next();
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
};


export {requireAdmin, requirePasswordChange, restrictTo};