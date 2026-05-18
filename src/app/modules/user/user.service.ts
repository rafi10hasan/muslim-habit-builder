import jwtHelpers from '../../../helpers/jwtHelpers';
import { randomUserImage } from '../../../utilities/randomUserImage';
import { BadRequestError } from '../../errors/request/apiError';

import { sendVerificationOtp } from '../auth/auth.utils';

import { USER_ROLE, USER_STATUS } from './user.constant';
import User from './user.model';
import { generateGuestEmail } from './user.utils';
import { TRegistrationPayload } from './user.validations';

// create account
const createAccount = async (payload: TRegistrationPayload) => {
  const existingUser = await User.findOne({ email: payload.email }).select('+password');

  if (existingUser) {
    if (existingUser.deletedAt) {
      existingUser.deletedAt = null;
      existingUser.status = USER_STATUS.ACTIVE;
      existingUser.password = payload.password;
      existingUser.verification.emailVerifiedAt = null;

      // Save first so sendVerificationOtp can look up the user if needed
      await existingUser.save();

      try {
        await sendVerificationOtp(existingUser._id, payload.email);
      } catch {
        // Roll back the restore on mail failure
        existingUser.deletedAt = existingUser.deletedAt;
        existingUser.status = USER_STATUS.ACTIVE; // or whatever the original status was
        await existingUser.save();
        throw new BadRequestError('Failed to send verification email. Try again.');
      }

      return { status: 'UNVERIFIED' };
    }

    if (existingUser.status === USER_STATUS.BLOCKED) {
      throw new BadRequestError('This account is blocked. Contact support.');
    }

    if (existingUser.status === USER_STATUS.DISABLED) {
      throw new BadRequestError('This account is currently disabled. Please login again to enable it.');
    }

    if (!existingUser.verification.emailVerifiedAt) {
      try {
        await sendVerificationOtp(existingUser._id, payload.email);
      } catch {
        throw new BadRequestError('Failed to send verification email. Try again.');
      }
      return { status: 'UNVERIFIED' };
    }

    throw new BadRequestError('An account with this email already exists.');
  }

  // Save first so the OTP service can reference a real DB record
  const newUser = new User({
    ...payload,
    avatar: randomUserImage(),
    role: USER_ROLE.USER,
    status: USER_STATUS.ACTIVE,
  });

  await newUser.save();

  try {
    await sendVerificationOtp(newUser._id, payload.email);
  } catch {
    throw new BadRequestError('Failed to send verification email. Try again.');
  }

  return { id: newUser._id, email: newUser.email };
};


// create guest account
const createGuestAccount = async () => {

  const guestEmail = generateGuestEmail();
  const fullName = `${guestEmail.split('@')[0]}`;
  // Create Guest
  const newGuest = await User.create({
    fullName,
    email: guestEmail,
    avatar: randomUserImage(),
    role: USER_ROLE.GUEST,
    verification: {
      emailVerifiedAt: new Date()
    },
  });

  if (!newGuest) {
    throw new BadRequestError('Failed to create guest account. Try again.');
  }

  const jwtPayload = {
    id: newGuest._id,
    role: newGuest.role,
  };
  const tokens = await jwtHelpers.generateTokens(jwtPayload);
  return tokens;

};

export const userService = {
  createAccount,
  createGuestAccount
};
