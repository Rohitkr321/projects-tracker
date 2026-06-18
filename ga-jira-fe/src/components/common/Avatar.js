import React from 'react';
import { StyleSheet } from 'react-native';
import { Avatar as PaperAvatar } from 'react-native-paper';
import PropTypes from 'prop-types';
import { getInitials, getAvatarColor } from '../../utils/helpers';

const Avatar = ({ user, size = 36, style }) => {
  if (!user) {
    return (
      <PaperAvatar.Icon
        size={size}
        icon="account"
        style={[styles.avatar, style]}
      />
    );
  }

  if (user.avatar) {
    return (
      <PaperAvatar.Image
        size={size}
        source={{ uri: user.avatar }}
        style={[styles.avatar, style]}
      />
    );
  }

  const displayName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.name || user.email);
  const initials = getInitials(displayName);
  const bgColor = getAvatarColor(displayName);

  return (
    <PaperAvatar.Text
      size={size}
      label={initials}
      style={[styles.avatar, { backgroundColor: bgColor }, style]}
      labelStyle={styles.label}
    />
  );
};

Avatar.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    avatar: PropTypes.string,
  }),
  size: PropTypes.number,
  style: PropTypes.object,
};

const styles = StyleSheet.create({
  avatar: {},
  label: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default Avatar;
