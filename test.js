const generateGuestEmail = () => {
   const timestamp = Date.now().toString(36).toLowerCase();
   const randomStr = Math.random().toString(36).substring(2, 5).toLowerCase();
   return `guest_${timestamp}${randomStr}@guest.com`;
};

console.log(generateGuestEmail());