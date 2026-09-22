import type {
  ShopifyProduct,
  ShopifyProductVariant,
} from "./shopify-types";

export function selectedOptionsMap(variant: ShopifyProductVariant | undefined) {
  return Object.fromEntries(
    variant?.selectedOptions.map((option) => [option.name, option.value]) ?? []
  );
}

export function findInitialVariant(
  product: ShopifyProduct,
  requestedVariant: string | undefined
) {
  const requested = requestedVariant?.trim();
  const matched = requested
    ? product.variants.find(
        (variant) =>
          variant.id === requested || variant.id.split("/").pop() === requested
      )
    : undefined;

  return (
    matched ??
    product.variants.find((variant) => variant.availableForSale) ??
    product.variants[0]
  );
}

export function findSelectedVariant(
  product: ShopifyProduct,
  selectedOptions: Record<string, string>
) {
  return product.variants.find((variant) =>
    variant.selectedOptions.every(
      (option) => selectedOptions[option.name] === option.value
    )
  );
}

export function isOptionValueAvailable(
  product: ShopifyProduct,
  optionName: string,
  value: string
) {
  return product.variants.some(
    (variant) =>
      variant.availableForSale &&
      variant.selectedOptions.some(
        (option) => option.name === optionName && option.value === value
      )
  );
}

export function findCompatibleVariantForOption(
  product: ShopifyProduct,
  optionName: string,
  value: string,
  currentSelections: Record<string, string> = {}
) {
  const nextSelections = { ...currentSelections, [optionName]: value };
  const preservingVariant = product.variants.find(
    (variant) =>
      variant.availableForSale &&
      variant.selectedOptions.every(
        (option) => nextSelections[option.name] === option.value
      )
  );

  return preservingVariant ?? product.variants.find(
    (variant) =>
      variant.availableForSale &&
      variant.selectedOptions.some(
        (option) => option.name === optionName && option.value === value
      )
  );
}
