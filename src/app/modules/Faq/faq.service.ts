
import QueryBuilder from '../../../builder/QueryBuilder';
import { BadRequestError } from '../../errors/request/apiError';
import { Faq } from './faq.model';
import { TCreateFaqPayload, TUpdatedFaqPayload } from './faq.zod.validation';
import { PipelineStage } from 'mongoose';

const createFaqByAdminIntoDb = async (payload: TCreateFaqPayload) => {
  const faq = await Faq.create(payload);
  return faq;
};

const getAllFaqForAdmin = async (query: Record<string, unknown>) => {
  const baseQuery = Faq.find();

  const builder = new QueryBuilder(baseQuery, query);

  builder.search(['question', 'answer']).filter().sort().paginate().fields();

  const data = await builder.modelQuery.exec();
  const meta = await builder.countTotal();

  return {
    meta: {
      page: meta.page,
      limit: meta.limit,
      total: meta.total,
      totalPages: meta.totalPage,
    },
    data,
  };
};

const getAllFaqForUser = async (query: Record<string, unknown>) => {
  const { search } = query as { search?: string };

  const match: Record<string, unknown> = { isPublished: true };

  if (search) {
    match.$or = [
      { question: { $regex: search, $options: 'i' } },
      { answer: { $regex: search, $options: 'i' } },
    ];
  }

  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $project: {
        question: 1,
        answer: 1,
        isPublished: 1,
      },
    },
  ];

  const faqs = await Faq.aggregate(pipeline);
  return faqs;
};

const updateFaqIntoDb = async (id: string, payload: TUpdatedFaqPayload) => {
  const updatedFaq = await Faq.findByIdAndUpdate(id, payload, {
    new: true,
  });

  if (!updatedFaq) {
    throw new BadRequestError('FAQ not found!');
  }

  return updatedFaq;
};

const deleteFaqFromDb = async (id: string) => {
  const deletedFaq = await Faq.findByIdAndDelete(id);

  if (!deletedFaq) {
    throw new BadRequestError('FAQ not found!');
  }

  return deletedFaq;
};

export const FaqService = {
  createFaqByAdminIntoDb,
  updateFaqIntoDb,
  deleteFaqFromDb,
  getAllFaqForAdmin,
  getAllFaqForUser,
};
