const registerRequestSchema = {
  email: {
    in: ["body"],
    errorMessage: "Email is required",
    isEmail: true,
    toLowerCase: true,
  },
  firstName: {
    in: ["body"],
    toLowerCase: true,
  },
  lastName: {
    in: ["body"],
    toLowerCase: true,
  },
  isUsCitizen: {
    in: ["body"],
    isBoolean: true,
  },
  password: {
    in: ["body"],
    errorMessage: "Password is required",
    isLength: {
      errorMessage: "Passwords length must be greater and equal to 8",
      options: { min: 8 },
    },
  },
};

const loginRequestSchema = {
  email: {
    in: ["body"],
    errorMessage: "Email is required",
    isEmail: true,
    toLowerCase: true,
  },
  password: {
    in: ["body"],
    errorMessage: "Password is required",
    isLength: {
      errorMessage: "Passwords length must be greater and equal to 8",
      options: { min: 8 },
    },
  },
};

const completeEmailVerificationRequest = {
  verificationCode: {
    in: ["body"],
    errorMessage: "Verification Code is required",
    isStr: true,
    isLength: {
      errorMessage: "Length must be equal to 6",
      options: {
        min: 6,
        max: 6,
      },
    },
    customSanitizer: {
      options: (value) => {
        let sanitizedValue;
        if (parseInt(value)) {
          sanitizedValue = parseInt(value);
        } else {
          sanitizedValue = 111111;
        }
        return sanitizedValue;
      },
    },
  },
};

module.exports = {
  RegisterRequestSchema: registerRequestSchema,
  LoginRequestSchema: loginRequestSchema,
  CompleteEmailVerificationRequestSchema: completeEmailVerificationRequest,
};
