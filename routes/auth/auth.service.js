const jwt = require('jsonwebtoken');
const models = require('../../models');
const { StatusCodes } = require('http-status-codes');
const { fn, col, literal, where, Op } = require('sequelize');

const {
  ErrorHandler,
  resolveSchemaValidationResult,
} = require('../../helpers/errorHandler');
const {
  createRefreshToken,
  createToken,
  createForgetPasswordToken,
} = require('../../helpers/token');
const { checkHash } = require('../../helpers/security');
const { authorizedUser } = require('../../helpers/authorization');
const { USER_ROLES } = require('../../constants/userRoles');
const { generateSixDigitCode } = require('../../helpers/randomCodes');
const { sendEmail } = require('../../utils/mailer');
const { forgetPasswordBody } = require('../../constants/emailTemplates');

require('dotenv').config();

const _register = async (req, res, next) => {
  try {
    resolveSchemaValidationResult(req);

    // check if email already exists
    const doesUserExist = await models.User.findOne({
      where: { email: req.body.email },
    });

    if (doesUserExist) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        `A user with email ${req.body.email} already exists`
      );
    }

    const userCreated = await models.User.create({
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      isUsCitizen: req.body.isUsCitizen,
      password: req.body.password,
    });

    const token = createToken(userCreated.id);
    // store token in DB
    const newToken = await models.JwtToken.create({
      token,
      user_id: userCreated.id,
    });
    if (!newToken) {
      throw new ErrorHandler(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Couldn't create token"
      );
    }

    const refreshToken = createRefreshToken();

    // store refresh token in DB
    const newRefreshToken = await models.JwtRefreshToken.create({
      token: refreshToken,
      user_id: userCreated.id,
    });

    if (!newRefreshToken) {
      throw new ErrorHandler(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Couldn't create refresh token"
      );
    }

    const decodedToken = await jwt.verify(token, process.env.JWT_SECRET);
    const decodedRefreshToken = await jwt.verify(
      refreshToken,
      process.env.JWT_SECRET
    );

    res.status(StatusCodes.CREATED).json({
      data: {
        type: 'user',
        id: userCreated.id,
        attributes: {
          email: userCreated.email,
          role: userCreated.role,
          firstName: userCreated.firstName,
          lastName: userCreated.lastName,
          created_at: userCreated.createdAt,
          updated_at: userCreated.updatedAt,
        },
      },
      included: [
        {
          type: 'token',
          attributes: {
            token,
            expiration: new Date(decodedToken.exp * 1000),
          },
        },
        {
          type: 'refresh_token',
          attributes: {
            token: refreshToken,
            expiration: new Date(decodedRefreshToken.exp * 1000),
          },
        },
      ],
      apiresponse: true,
    });
  } catch (err) {
    next(err);
  }
};

const _login = async (req, res, next) => {
  try {
    resolveSchemaValidationResult(req);

    const user = await models.User.findOne({
      where: { email: req.body.email },
    });
    if (!user || !checkHash(req.body.password, user.salt, user.password)) {
      throw new ErrorHandler(
        StatusCodes.UNAUTHORIZED,
        'Wrong email or password'
      );
    }

    const token = createToken(user.id);
    // store token in DB
    const newToken = await models.JwtToken.create({
      token,
      user_id: user.id,
    });
    if (!newToken) {
      throw new ErrorHandler(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Couldn't create token"
      );
    }

    const refreshToken = createRefreshToken();

    // store refresh token in DB
    const newRefreshToken = await models.JwtRefreshToken.create({
      token: refreshToken,
      user_id: user.id,
    });

    if (!newRefreshToken) {
      throw new ErrorHandler(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Couldn't create refresh token"
      );
    }

    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    const decodedRefreshToken = await jwt.verify(
      refreshToken,
      process.env.JWT_SECRET
    );

    res.status(StatusCodes.OK).json({
      data: {
        type: 'user',
        id: user.id,
        attributes: {
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      },
      included: [
        {
          type: 'token',
          attributes: {
            token,
            expiration: new Date(decoded.exp * 1000),
          },
        },
        {
          type: 'refresh_token',
          attributes: {
            token: refreshToken,
            expiration: new Date(decodedRefreshToken.exp * 1000),
          },
        },
      ],
      apiresponse: true,
    });
  } catch (err) {
    next(err);
  }
};

const adminLogin = async (req, res, next) => {
  try {
    resolveSchemaValidationResult(req);

    const user = await models.User.findOne({
      where: { email: req.body.email },
    });
    if (!user || !checkHash(req.body.password, user.salt, user.password)) {
      throw new ErrorHandler(
        StatusCodes.UNAUTHORIZED,
        'Wrong email or password'
      );
    }
    if (user.role !== USER_ROLES.ADMIN) {
      throw new ErrorHandler(
        StatusCodes.UNAUTHORIZED,
        'This user does not have admin priviliges.'
      );
    }

    const token = createToken(user.id);
    // store token in DB
    const newToken = await models.JwtToken.create({
      token,
      user_id: user.id,
    });
    if (!newToken) {
      throw new ErrorHandler(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Couldn't create token"
      );
    }

    const refreshToken = createRefreshToken();

    // store refresh token in DB
    const newRefreshToken = await models.JwtRefreshToken.create({
      token: refreshToken,
      user_id: user.id,
    });

    if (!newRefreshToken) {
      throw new ErrorHandler(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Couldn't create refresh token"
      );
    }

    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    const decodedRefreshToken = await jwt.verify(
      refreshToken,
      process.env.JWT_SECRET
    );

    res.status(StatusCodes.OK).json({
      data: {
        type: 'user',
        id: user.id,
        attributes: {
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      },
      included: [
        {
          type: 'token',
          attributes: {
            token,
            expiration: new Date(decoded.exp * 1000),
          },
        },
        {
          type: 'refresh_token',
          attributes: {
            token: refreshToken,
            expiration: new Date(decodedRefreshToken.exp * 1000),
          },
        },
      ],
      apiresponse: true,
    });
  } catch (err) {
    next(err);
  }
};

const _refresh = async (req, res, next) => {
  try {
    const refreshToken = jwt.verify(
      req.body.refresh_token,
      process.env.JWT_SECRET
    );

    if (!refreshToken) {
      throw new ErrorHandler(StatusCodes.FORBIDDEN, 'Refresh token expired');
    }

    // get user by token
    const refreshTokenInDb = await models.JwtRefreshToken.findOne({
      where: {
        token: req.body.refresh_token,
      },
    });

    if (!refreshTokenInDb) {
      throw new ErrorHandler(
        StatusCodes.NOT_FOUND,
        "Refresh token doesn't exist"
      );
    }

    const token = createToken(refreshTokenInDb.user_id);
    const newRefreshToken = createRefreshToken();

    // store new token
    await models.JwtToken.create({
      user_id: refreshTokenInDb.user_id,
      token,
    });

    // store new refresh token
    await models.JwtRefreshToken.create({
      user_id: refreshTokenInDb.user_id,
      token: newRefreshToken,
    });

    // delete old one
    await models.JwtRefreshToken.destroy({
      where: {
        id: refreshTokenInDb.id,
      },
    });

    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    const decodedRefreshToken = await jwt.verify(
      newRefreshToken,
      process.env.JWT_SECRET
    );

    res.status(StatusCodes.ACCEPTED).json({
      data: {
        type: 'token',
        attributes: {
          token,
          expiration: new Date(decoded.exp * 1000),
        },
      },
      included: {
        type: 'refresh_token',
        attributes: {
          token: newRefreshToken,
          expiration: new Date(decodedRefreshToken.exp * 1000),
        },
      },
      apiresponse: true,
    });
  } catch (err) {
    next(err);
  }
};

const _me = async (req, res, next) => {
  try {
    const user = await models.User.findByPk(req.userId);
    if (!user) {
      throw new ErrorHandler(
        StatusCodes.NOT_FOUND,
        `No user with id ${req.userId}`
      );
    }

    let kycImages = false;
    if (user.kycFrontImage && user.kycBackImage) {
      kycImages = true;
    }

    res.status(StatusCodes.OK).json({
      data: {
        email: user.email,
        firstname: user.firstName,
        id: user.id,
        lastname: user.lastName,
        active: user.active,
        approved: user.approved,
        kycImages: kycImages,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
      apiresponse: true,
    });
  } catch (err) {
    next(err);
  }
};

const createEmailVerificationRequest = async (request, response, next) => {
  try {
    let userId = request.userId;

    let User = await models.User.findOne({
      where: { id: userId },
      raw: true,
      nest: true,
    });

    if (User.active) {
      response
        .status(StatusCodes.BAD_REQUEST)
        .json({ Message: 'User is already active.' });
    }

    let VerificationRequestExists = await models.EmailVerification.findOne({
      where: { userId: userId },
      raw: true,
      nest: true,
    });

    if (VerificationRequestExists) {
      let DeleteOldVerificationRequest = await models.EmailVerification.destroy(
        { where: { userId: userId } }
      );
    }

    let verificationCode = generateSixDigitCode();

    let CreateNewVerificationRequest = await models.EmailVerification.create({
      userId: userId,
      verificationCode: verificationCode,
    });

    if (!CreateNewVerificationRequest) {
      throw new ErrorHandler(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Something went wrong'
      );
    }

    let emailDetailsConfig = {};
    emailDetailsConfig.to = User.email;
    emailDetailsConfig.subject = 'Verification Code - Smart Crowd';
    emailDetailsConfig.text = `Your verification code is ${verificationCode}`;

    sendEmail(emailDetailsConfig);

    response
      .status(StatusCodes.OK)
      .json({ Message: 'Verification email sent', apiresponse: true });
  } catch (error) {
    next(error);
  }
};

const completeEmailVerificationRequest = async (request, response, next) => {
  try {
    resolveSchemaValidationResult(request);

    let User = await models.User.findOne({
      where: { id: request.userId },
      raw: true,
      nest: true,
    });

    if (User.active) {
      response
        .status(StatusCodes.BAD_REQUEST)
        .json({ Message: 'User is already active.', apiresponse: false });
      return;
    }

    let EmailVerificationRequest = await models.EmailVerification.findOne({
      where: { userId: User.id },
      raw: true,
      nest: true,
    });

    if (
      EmailVerificationRequest.verificationCode == request.body.verificationCode
    ) {
      let UpdateUserActiveStatus = await models.User.update(
        { active: true },
        { where: { id: User.id } }
      );
    } else {
      response
        .status(StatusCodes.BAD_REQUEST)
        .json({ Message: 'Incorrect verification code', apiresponse: false });
      return;
    }

    response
      .status(StatusCodes.CREATED)
      .json({ Message: 'User has been activated.', apiresponse: true });
  } catch (error) {
    next(error);
  }
};

const forgetPassword = async (request, response, next) => {
  try {
    resolveSchemaValidationResult(request);

    let User = await models.User.findOne({
      where: { email: request.body.email },
      raw: true,
      nest: true,
    });

    if (!User) {
      response.status(StatusCodes.CREATED).json({
        Message:
          'We have sent you an email with the link where you can reset your password',
        apiresponse: true,
      });
      return;
    }

    let LastRequestInTenDays = await models.ForgetPassword.findAll({
      where: {
        [Op.and]: [
          where(
            fn(
              'timestampdiff',
              literal('day'),
              col('created_at'),
              literal('CURRENT_TIMESTAMP')
            ),
            { [Op.lte]: 10 }
          ),
        ],
        email: request.body.email,
      },
      order: [['created_at', 'DESC']],
      raw: true,
      limit: 1,
    });

    if (LastRequestInTenDays.length) {
      response.status(StatusCodes.OK).json({
        Message:
          'You cannot request a password change if your last request was made less than 10 days ago.',
        apiresponse: true,
      });
      return;
    }

    let forgetPasswordToken = createForgetPasswordToken(request.body.email);

    let ForgetPasswordEntry = await models.ForgetPassword.create({
      email: request.body.email,
      token: forgetPasswordToken,
    });

    let emailDetailsConfig = new Object();
    emailDetailsConfig.to = request.body.email;
    emailDetailsConfig.subject = 'Change of Password';
    emailDetailsConfig.text = forgetPasswordBody(forgetPasswordToken);

    sendEmail(emailDetailsConfig);

    response.status(StatusCodes.CREATED).json({
      Message:
        'We have sent you an email with the link where you can reset your password',
      apiresponse: true,
    });
  } catch (error) {
    next(error);
  }
};

const validForgetPasswordLink = async (request, response, next) => {
  try {
    resolveSchemaValidationResult(request);

    await jwt.verify(
      request.query.token,
      process.env.JWT_SECRET,
      (err, decoded) => {
        if (err) {
          throw new ErrorHandler(StatusCodes.FORBIDDEN, err.message);
        }
        console.log(decoded.email);
      }
    );

    response
      .status(StatusCodes.OK)
      .json({ Message: 'Link is active', apiresponse: true, validLink: true });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (request, response, next) => {
  try {
    resolveSchemaValidationResult(request);

    await models.User.update(
      { password: request.body.password, salt: '' },
      { where: { id: request.userId } }
    );

    response
      .status(StatusCodes.CREATED)
      .json({ Message: 'Password changed successfully', apiresponse: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  RegisterAuthService: _register,
  LoginAuthService: _login,
  AdminLogin: adminLogin,
  RefreshTokenAuthService: _refresh,
  MeAuthService: _me,
  CreateEmailVerificationRequest: createEmailVerificationRequest,
  CompleteEmailVerificationRequest: completeEmailVerificationRequest,
  ForgetPassword: forgetPassword,
  ValidForgetPasswordLink: validForgetPasswordLink,
  ResetPasswowrd: resetPassword,
};
