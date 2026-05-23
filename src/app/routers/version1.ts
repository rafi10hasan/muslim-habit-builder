import express from 'express';
import authRouter from '../modules/auth/auth.route';
import { contentRouter } from '../modules/content/content.route';

import faqRouter from '../modules/Faq/faq.route';
import habitTemplateRouter from '../modules/habit-template/system.habit.route';
import quranContentRouter from '../modules/quran-content/quran.content.route';
import userHabitRouter from '../modules/user-habit/user.habit.route';
import userRouter from '../modules/user/user.route';
import habitProgressRouter from '../modules/habit-progress/habit.progress.route';
import bugRouter from '../modules/bug/bug.route';


const routersVersionOne = express.Router();

const appRouters = [
  {
    path: '/user',
    router: userRouter,
  },
  {
    path: '/auth',
    router: authRouter,
  },

  {
    path: '/content',
    router: contentRouter,
  },

  {
    path: '/user-habit',
    router: userHabitRouter,
  },

  {
    path: '/habit-template',
    router: habitTemplateRouter,
  },

   {
    path: '/progress',
    router: habitProgressRouter,
  },

   {
    path: '/bug',
    router: bugRouter,
  },

  {
    path: '/quran-content',
    router: quranContentRouter,
  },

  {
    path: '/faq',
    router: faqRouter,
  },
];

appRouters.forEach((router) => {
  routersVersionOne.use(router.path, router.router);
});

export default routersVersionOne;
