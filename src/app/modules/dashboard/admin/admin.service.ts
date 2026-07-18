import { BadRequestError } from "../../../errors/request/apiError";
import { IUser } from "../../user/user.interface";


const getMe = async(user:IUser)=>{
  return {
    name: user.fullName,
    email: user.email,
    avatar: user.avatar,

  }
}

const updateAdminProfile = async(user:IUser, payload:{fullName: string})=>{

  if(!payload.fullName){
    throw new BadRequestError('Full name is required to update profile');
  }

  if(payload.fullName){
    user.fullName = payload.fullName;
  }
  await user.save();
  return {
    fullName: user.fullName
  }
}
export const adminService = {
    getMe,
    updateAdminProfile
}