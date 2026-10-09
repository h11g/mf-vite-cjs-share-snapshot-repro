import { useState } from 'react';

export function useTick() {
  return useState(0);
}
