import React from 'react';
import {
  Box,
  Container,
  Stack,
  Text,
  Link,
  useColorModeValue,
} from '@chakra-ui/react';

const Footer = () => {
  return (
    <Box
      bg={useColorModeValue('gray.50', 'gray.900')}
      color={useColorModeValue('gray.700', 'gray.200')}
      borderTop={1}
      borderStyle={'solid'}
      borderColor={useColorModeValue('gray.200', 'gray.700')}
    >
      <Container
        as={Stack}
        maxW={'6xl'}
        py={4}
        direction={{ base: 'column', md: 'row' }}
        spacing={4}
        justify={{ base: 'center', md: 'space-between' }}
        align={{ base: 'center', md: 'center' }}
      >
        <Text>© 2024 IntelliView. All rights reserved</Text>
        <Stack direction={'row'} spacing={6}>
          <Link href={'#'}>Privacy Policy</Link>
          <Link href={'#'}>Terms of Use</Link>
          <Link href={'#'}>Contact</Link>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer; 