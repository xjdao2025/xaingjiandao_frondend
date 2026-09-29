// Keep the entered text intact; invalid money values must never become another amount.
export function integerInputError(value: string, label: string, min = 0, max = 999_999_999) {
  return /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max
    ? null : `${label}请输入 ${min}～${max} 的整数，不支持负数或小数。`
}
