import React from 'react';
import { render } from '@testing-library/react';
import Investigations from 'src/js/pages/Investigations';

describe('Investigations minimal coverage', () => {
  it('renders without crashing', () => {
    render(<Investigations />);
  });
});
