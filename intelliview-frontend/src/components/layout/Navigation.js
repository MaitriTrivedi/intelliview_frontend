import React from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Stack,
  Link,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NavLink = ({ children, to }) => (
  <Link
    as={RouterLink}
    to={to}
    px={2}
    py={1}
    rounded={'md'}
    _hover={{
      textDecoration: 'none',
      bg: useColorModeValue('gray.200', 'gray.700'),
    }}
  >
    {children}
  </Link>
);

export default function Navigation() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Box bg={useColorModeValue('white', 'gray.800')} px={4} shadow="sm">
      <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
        <Text
          as={RouterLink}
          to="/"
          fontSize="xl"
          fontWeight="bold"
          color="brand.600"
        >
          Intelliview
        </Text>

        <Flex alignItems={'center'}>
          <Stack direction={'row'} spacing={4}>
            {user ? (
              <>
                <NavLink to="/practice">Practice</NavLink>
                <NavLink to="/history">History</NavLink>
                <Menu>
                  <MenuButton
                    as={Button}
                    variant="ghost"
                    size="sm"
                  >
                    Profile
                  </MenuButton>
                  <MenuList>
                    <MenuItem as={RouterLink} to="/profile">
                      My Profile
                    </MenuItem>
                    <MenuItem onClick={handleSignOut}>
                      Sign Out
                    </MenuItem>
                  </MenuList>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  as={RouterLink}
                  to="/login"
                  variant="ghost"
                  size="sm"
                >
                  Sign In
                </Button>
                <Button
                  as={RouterLink}
                  to="/register"
                  colorScheme="brand"
                  size="sm"
                >
                  Sign Up
                </Button>
              </>
            )}
          </Stack>
        </Flex>
      </Flex>
    </Box>
  );
} 