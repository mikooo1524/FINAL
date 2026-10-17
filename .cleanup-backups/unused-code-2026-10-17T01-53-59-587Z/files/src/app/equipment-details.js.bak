import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { EquipmentDetailsScreen } from '../customerScreens';
import { useCompatNavigation } from '../navigationCompat';

export default function EquipmentDetailsRoute() {
  const params = useLocalSearchParams();
  return <EquipmentDetailsScreen navigation={useCompatNavigation()} route={{ params }} />;
}
