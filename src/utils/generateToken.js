import jwt from "jsonwebtoken";

/**
 * Generate JWT and store it in an HTTP-only cookie
 * @param {Object} user - Prisma user object
 * @param {Object} res - Express response object
 * @returns {String} token
 */
const generateToken = (user, res) => {
  const payload = {
    id: user.id,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  // Set role-specific cookie name so different roles can be logged out independently
  const roleCookieName = `jwt_${String(user.role).toLowerCase()}`;

  res.cookie(roleCookieName, token, {
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24 * 7, 
  });

  if (!res.getHeader('Set-Cookie') || !(res.getHeader('Set-Cookie')?.toString().includes('jwt='))) {
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
  }

  return token;
};

export default generateToken;
