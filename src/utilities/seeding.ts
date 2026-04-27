
import { USER_ROLE, USER_STATUS } from '../app/modules/user/user.constant';
import User from '../app/modules/user/user.model';
import config from '../config';
import { randomUserImage } from './randomUserImage';

const adminData = {
  fullName: 'ADMIN',
  role: USER_ROLE.SUPER_ADMIN,
  email: config.admin_email,
  password: config.admin_password,
  avatar: randomUserImage(),
  verification: {
    emailVerifiedAt: new Date(),
  },
  status: USER_STATUS.ACTIVE
};

const seedingAdmin = async () => {
  try {
    const admin = await User.findOne({
      email: adminData.email,
    });
    if (!admin) {
      await User.create(adminData);

      console.log('admin seeded successfully!');
    } else {
      console.log('admin already exists!');
    }
  } catch (error) {
    console.log('Error seeding super admin', error);
  }
};

export default seedingAdmin;
