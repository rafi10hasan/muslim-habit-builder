import { BadRequestError, NotFoundError } from "../../../errors/request/apiError";
import { AdhkarSet } from "./adhkar.set.model";
import { TAdhakarItemPayload, TAdhakarPayload, TUpdateAdhakarItemPayload } from "./adhkar.set.zod";



// 1. Create a new Adhkar Set
const createAdhakar = async (payload: TAdhakarPayload) => {
    const isExist = await AdhkarSet.findOne({ name: payload.name });
    if (isExist) {
        throw new BadRequestError('Adhkar set with this name already exists');
    }
    const result = await AdhkarSet.create(payload);
    return result;
};

// 2. Delete the main Adhkar Set completely
const deleteAdhakarSet = async (setId: string) => {
    const result = await AdhkarSet.findByIdAndDelete(setId);
    if (!result) {
        throw new NotFoundError('Adhkar set not found');
    }
    return result;
};

// 3. Add a new sub-item into an Adhkar Set
const addAdhakarItem = async (setId: string, itemPayload: TAdhakarItemPayload) => {
    const adhakarSet = await AdhkarSet.findById(setId);
    if (!adhakarSet) {
        throw new NotFoundError('Adhkar set not found');
    }

 
    // Auto-assign order tracking based on current length
    const nextOrder = adhakarSet.items.length + 1;

    const newItem = {
        ...itemPayload,
        order: nextOrder,
        // Ensure `count` is explicitly set to number or null (not undefined)
        count: itemPayload.count ?? null,
    };

    // Mongoose tracks array pushes naturally; markModified is not required
    adhakarSet.items.push(newItem);
    adhakarSet.totalCount = adhakarSet.items.length;

    await adhakarSet.save();
    return adhakarSet;
};

const updateAdhakarItem = async (setId: string, itemIndex: number, updatePayload: TUpdateAdhakarItemPayload) => {
    const adhakarSet = await AdhkarSet.findById(setId);
    if (!adhakarSet) {
        throw new NotFoundError('Adhkar set not found');
    }

    // Validate if the provided index exists in the array bounds
    if (itemIndex < 0 || itemIndex >= adhakarSet.items.length) {
        throw new BadRequestError('Invalid item index provided');
    }

    // Mutate individual properties directly on the specific array index
    const item = adhakarSet.items[itemIndex];
    if (updatePayload.title) item.title = updatePayload.title;
    if (updatePayload.arabic) item.arabic = updatePayload.arabic;
    if (updatePayload.transliteration) item.transliteration = updatePayload.transliteration;
    if (updatePayload.translation) item.translation = updatePayload.translation;
    if (updatePayload.virtue !== undefined) item.virtue = updatePayload.virtue;
    if (updatePayload.reference !== undefined) item.reference = updatePayload.reference;
    if (updatePayload.count !== undefined) item.count = updatePayload.count;

    await adhakarSet.save();
    return adhakarSet;
};

// 5. Delete an Adhkar Item using Array Index and close the ordering gap
const deleteAdhakarItem = async (setId: string, itemIndex: number) => {
    const adhakarSet = await AdhkarSet.findById(setId);
    if (!adhakarSet) {
        throw new NotFoundError('Adhkar set not found');
    }

    // Validate if the provided index exists in the array bounds
    if (itemIndex < 0 || itemIndex >= adhakarSet.items.length) {
        throw new BadRequestError('Invalid item index provided');
    }

    const deletedOrder = adhakarSet.items[itemIndex].order;

    // Remove the item directly using the index via splice
    adhakarSet.items.splice(itemIndex, 1);

    // Synchronize order values sequentially for the remaining items
    adhakarSet.items.forEach((item) => {
        if (item.order > deletedOrder) {
            item.order -= 1;
        }
    });

    adhakarSet.totalCount = adhakarSet.items.length;

    await adhakarSet.save();
    return adhakarSet;
};

// 6. Preview and fetch the full Adhkar Set ordered sequentially
const getAdhakarPreview = async (setId: string) => {
    const adhakarSet = await AdhkarSet.findById(setId);
    if (!adhakarSet) {
        throw new NotFoundError('Adhkar set not found');
    }
    
    // Sort array elements internally by their assigned sequential orders
    adhakarSet.items.sort((a, b) => a.order - b.order);
    
    return adhakarSet;
};

export const adhakarService = {
    createAdhakar,
    deleteAdhakarSet,
    addAdhakarItem,
    updateAdhakarItem,
    deleteAdhakarItem,
    getAdhakarPreview
};