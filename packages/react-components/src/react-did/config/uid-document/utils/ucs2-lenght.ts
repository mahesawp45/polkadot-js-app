/* eslint-disable */
export function ucs2length(s: string) {
    let result = 0
    let length = s.length
    let index = 0
    let charCode: number
    while (index < length) {
      result++
      charCode = s.charCodeAt(index++)
      if (charCode >= 0xd800 && charCode <= 0xdbff && index < length) {
        // high surrogate, and there is a next character
        charCode = s.charCodeAt(index)
        if ((charCode & 0xfc00) == 0xdc00) {
          // low surrogate
          index++
        }
      }
    }
    return result
  }