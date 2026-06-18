import React from 'react';
import { StyleSheet } from 'react-native';
import { Searchbar, useTheme } from 'react-native-paper';
import PropTypes from 'prop-types';

const SearchBar = ({ value, onChangeText, placeholder = 'Search...', style, ...props }) => {
  const theme = useTheme();

  return (
    <Searchbar
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      style={[
        styles.searchBar,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.outline,
        },
        style,
      ]}
      inputStyle={[styles.input, { color: theme.colors.onSurface }]}
      iconColor={theme.colors.onSurfaceVariant}
      placeholderTextColor={theme.colors.onSurfaceVariant}
      elevation={0}
      {...props}
    />
  );
};

SearchBar.propTypes = {
  value: PropTypes.string.isRequired,
  onChangeText: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  style: PropTypes.object,
};

const styles = StyleSheet.create({
  searchBar: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    fontSize: 14,
  },
});

export default SearchBar;
