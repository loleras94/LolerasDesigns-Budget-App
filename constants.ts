import { AccountType, CostCategory, MustSubCategory, WantsSubCategory, HomeDetail, MovementDetail, FunDetail, ShoppingDetail, HealthDetail, SubscriptionsDetail, TravelDetail, GiftsDetail, HobbyDetail } from './types';

type CategoryStructure = {
  [key in CostCategory]: {
    subCategories: {
      [key in MustSubCategory | WantsSubCategory]?: string[];
    };
  };
};

export const CATEGORIES: CategoryStructure = {
  [CostCategory.MUST]: {
    subCategories: {
      HOME: ['ELECTR_POWER', 'RENT', 'INTERNET', 'PHONE', 'SUPERMARKET', 'WATER', 'OTHER'] as HomeDetail[],
      MOVEMENT: ['GAS', 'WASHING', 'OTHER'] as MovementDetail[],
      HEALTH: ['OTHER'] as HealthDetail[],
      OTHER: ['OTHER'],
    },
  },
  [CostCategory.WANTS]: {
    subCategories: {
      FUN: ['FOOD', 'DRINKS', 'CINEMA', 'OPAP', 'BOWLING', 'OTHER'] as FunDetail[],
      SHOPPING: ['JUMBO', 'HAIRCUT', 'OTHER'] as ShoppingDetail[],
      SUBSCRIPTIONS: ['OTHER'] as SubscriptionsDetail[],
      TRAVEL: ['OTHER'] as TravelDetail[],
      GIFTS: ['OTHER'] as GiftsDetail[],
      HOBBY: ['OTHER'] as HobbyDetail[],
      OTHER: ['OTHER'],
    },
  },
};

export const ACCOUNT_TYPES: AccountType[] = ['Bank', 'Brokerage', 'Cash', 'Crypto'];