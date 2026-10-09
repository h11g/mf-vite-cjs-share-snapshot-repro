import { useTick } from 'react-user';

export function Widget() {
  const [n, setN] = useTick();
  return <button onClick={() => setN(n + 1)}>tick {n}</button>;
}
