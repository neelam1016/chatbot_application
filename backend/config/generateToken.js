// import jwt from "jsonwebtoken";

// export const generateToken = (id) => {
//   console.log("process.env.JWT_SECRET", process.env.JWT_SECRET);
//   const token = jwt.sign({ id }, process.env.JWT_SECRET, {
//     expiresIn: "30d",
//   });
//   return token;
// };

// export const generateToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, {
//     expiresIn: "30d",
//   });
// };

import jwt from "jsonwebtoken";

export const generateToken = (id) => {
  try {
    console.log("genertae",process.env.JWT_SECRET)
    return jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
  } catch (error) {
    console.error("Error generating token:", error);
    throw new Error("Token generation failed");
  }
};

