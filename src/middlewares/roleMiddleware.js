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


export {requireAdmin, requirePasswordChange};