import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { RentalDetailsScreen } from '../customerScreens';
import { useCompatNavigation } from '../navigationCompat';

export default function RentalDetailsRoute() {
  const params = useLocalSearchParams();
  return <RentalDetailsScreen navigation={useCompatNavigation()} route={{ params }} />;
}
