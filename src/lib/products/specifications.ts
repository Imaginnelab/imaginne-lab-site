export const specificationLimits = {
  "category": 120,
  "material": 200,
  "finish": 200,
  "care": 1200
} as const;
export type SpecificationField = keyof typeof specificationLimits;
export const specificationFields = Object.keys(specificationLimits) as SpecificationField[];
export const specificationLanguages = ['pt', 'en', 'es'] as const;
export const basicSpecificationFields = ['category', 'material', 'finish', 'care'] as const;
export const visibleSpecificationFields = basicSpecificationFields;


export const specificationColumns = 'category_pt,category_en,category_es,material_pt,material_en,material_es,finish_pt,finish_en,finish_es,care_pt,care_en,care_es,width_cm,height_cm,depth_cm,weight_g,stock_quantity' as const;
