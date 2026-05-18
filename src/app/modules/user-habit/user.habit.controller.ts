import { Request, Response } from "express"
import { StatusCodes } from "http-status-codes"
import asyncHandler from "../../../shared/asynchandler"
import sendResponse from "../../../shared/sendResponse"
import { USER_HABIT_MESSAGES } from "./user.habit.constant"
import { userHabitService } from "./user.habit.service"



const addHabitInYourHabitListIntoDb = asyncHandler(async (req: Request, res: Response) => {

  const { habitId } = req.params;
  const { isActive } = req.body
  const result = await userHabitService.ToggleHabit(req.user, habitId as string, isActive)

  sendResponse(res, {
    statusCode: isActive ? StatusCodes.CREATED : StatusCodes.OK,
    success: true,
    message: isActive ? USER_HABIT_MESSAGES.ACTIVATED : USER_HABIT_MESSAGES.DEACTIVATED,
    data: result,
  })
})


const getTodayHabits = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.query;
  const result = await userHabitService.GetTodayHabits(req.user, category as string)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: USER_HABIT_MESSAGES.FETCHED,
    data: result,
  })
})

export const userHabitController = {
  addHabitInYourHabitListIntoDb,
  getTodayHabits
}