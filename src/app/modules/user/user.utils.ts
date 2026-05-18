export const generateAccountId = async () => {
    const prefix = "acc";
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${prefix}-${timestamp}${randomStr}`;

};


export const generateGuestEmail = () => {
   const timestamp = Date.now().toString(36).toLowerCase();
   const randomStr = Math.random().toString(36).substring(2, 5).toLowerCase();
   return `guest_${timestamp}${randomStr}@guest.com`;
};