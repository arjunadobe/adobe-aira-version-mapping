/* ${componentName} — App Builder web UI (React Spectrum). */
import React from 'react';
import { Provider, defaultTheme, View, Heading, Content } from '@adobe/react-spectrum';

export default function ${componentName}() {
  return (
    <Provider theme={defaultTheme} colorScheme="light">
      <View padding="size-300">
        <Heading level={2}>${componentName}</Heading>
        <Content>Your App Builder UI starts here.</Content>
      </View>
    </Provider>
  );
}
