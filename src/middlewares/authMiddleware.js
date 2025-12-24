import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {
  // Prefer generic jwt if provided, otherwise look for role-specific jwt_* cookies
  const cookies = req.cookies || {};
  let token = cookies.jwt;

  if (!token) {
    for (const [name, value] of Object.entries(cookies)) {
      if (name.startsWith('jwt_')) {
        token = value;
        break;
      }
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export {authenticate};