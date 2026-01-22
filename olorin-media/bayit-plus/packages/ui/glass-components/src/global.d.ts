import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }

  interface TextProps {
    className?: string;
  }

  interface ImageProps {
    className?: string;
  }

  interface ScrollViewProps {
    className?: string;
    contentContainerClassName?: string;
  }

  interface TouchableOpacityProps {
    className?: string;
  }

  interface PressableProps {
    className?: string;
  }

  interface TextInputProps {
    className?: string;
  }
}

declare module 'react-native-linear-gradient' {
  import { ViewProps } from 'react-native';

  export interface LinearGradientProps extends ViewProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    locations?: number[];
    className?: string;
  }

  const LinearGradient: React.ComponentType<LinearGradientProps>;
  export default LinearGradient;
}

declare module 'react-native-reanimated' {
  import * as RN from 'react-native';

  export interface AnimatedProps<P> extends P {
    className?: string;
  }
}
