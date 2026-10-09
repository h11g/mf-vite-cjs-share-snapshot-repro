import { createRoot } from 'react-dom/client';
import _ from 'lodash';
import { doubled } from 'cjs-consumer';
import { Widget } from './widget.jsx';

const result = { esmLodashDefault: typeof _, cjsRequireLodash: null, error: null };
try {
  result.cjsRequireLodash = JSON.stringify(doubled({ a: 1, b: 2 }));
} catch (error) {
  result.error = String(error);
}
window.__REPRO__ = result;
document.getElementById('out').textContent = JSON.stringify(result, null, 2);
createRoot(document.getElementById('app')).render(<Widget />);
