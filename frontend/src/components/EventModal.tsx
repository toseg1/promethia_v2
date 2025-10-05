import React from 'react';
import { EventModalContainer } from './eventmodal/EventModalContainer';
import { EventModalProps } from './eventmodal/types';

export function EventModal(props: EventModalProps) {
  return <EventModalContainer {...props} />;
}