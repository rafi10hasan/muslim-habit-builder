
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import { BadRequestError } from '../app/errors/request/apiError';

import config from '../config';
import { SessionModel } from '../app/modules/session/session.model';


// verify jwt token
const verifyToken = (token: string, secret: Secret): JwtPayload => {
  const payload = jwt.verify(token, secret) as JwtPayload;
  return payload;
};

// generate access token
const generateTokens = async (payload: JwtPayload) => {
  const accessTokenExpiresIn = config.jwt_access_token_expiresin as SignOptions['expiresIn'];
  const refreshTokenExpiresIn = config.jwt_refresh_token_expiresin as SignOptions['expiresIn'];

  const accessToken = jwt.sign(payload, config.jwt_access_token_secret!, {
    expiresIn: accessTokenExpiresIn,
  });

  const refreshToken = jwt.sign(payload, config.jwt_refresh_token_secret!, {
    expiresIn: refreshTokenExpiresIn,
  });

  const decoded = jwt.decode(refreshToken) as JwtPayload;
  if (!decoded || !decoded.exp) {
    throw new BadRequestError('Failed to decode refresh token for expiry');
  }

  await SessionModel.findOneAndUpdate(
    { user: payload.id },
    { refreshToken: refreshToken, expiresAt: decoded.exp * 1000, sessionId: payload.sessionId, lastLoginAt: new Date()},
    { upsert: true, new: true },
  );

  return { accessToken, refreshToken, sessionId:payload.sessionId };
};

// create token
const createToken = async (payload: JwtPayload) => {
  const accessTokenExpiresIn = config.otp_token_expiresin as SignOptions['expiresIn'];
  const token = jwt.sign(payload, config.jwt_access_token_secret!, {
    expiresIn: accessTokenExpiresIn,
  });
  return token;
};

const jwtHelpers = {
  generateTokens,
  verifyToken,
  createToken
};

export default jwtHelpers;


/*

const hash = crypto.createHash('sha256').update(incomingToken).digest();
const storedHash = Buffer.from(tokenDoc.refreshToken, 'hex');

if (!crypto.timingSafeEqual(hash, storedHash)) {
  throw new Error("Invalid refresh token");
}

*/