import React, { useState } from 'react';
import axios from 'axios';
import { Button,  Icon, Modal } from 'semantic-ui-react';
import { modalStyles } from '../styles';

function GppDelete(props) {
  const [ deleteFailed, setDeleteFailed ] = useState(false);
  const [ isOpen, setIsOpen ] = useState(false);

  const { playerEvent } = props;

  if(!playerEvent) {
    return null;
  }

  function deleteEvent() {
    axios.delete(`/api/player_events/${playerEvent.id}`)
    .then(result => {
      props.handler && props.handler(result.data)
      onClose();
    })
    .catch(err => setDeleteFailed(extractError(err.response)))
  }

  function extractError(response) {
    return (response && response.data && response.data.message) || 'Unknown error occurred';
  }

  function onClose() {
    setIsOpen(false);
    setDeleteFailed(false);
  }

  const trigger = props.icon ?
    <Icon name='delete' style={{ cursor: 'pointer' }} onClick={() => setIsOpen(true)} /> :
    <Button inverted onClick={() => setIsOpen(true)}>Delete GPP Event</Button>;

  return (
    <Modal open={isOpen} onClose={onClose} trigger={trigger} style={modalStyles} closeIcon>
      <Modal.Header style={modalStyles}>Delete GPP Event</Modal.Header>
      <Modal.Content style={modalStyles} scrolling>
      Are you sure you want to delete this event?
      <pre>
        {JSON.stringify(playerEvent, null, 2)}
      </pre>
      <Modal.Actions>
        <Button style={{ marginTop: '5px' }} className={'ui right floated secondary button'} onClick={() => onClose()}>Close</Button>
        <Button style={{ marginTop: '5px' }} className={'ui right floated negative button'} onClick={() => deleteEvent()}>Delete</Button>
      </Modal.Actions>
      </Modal.Content>
    </Modal>
  );
}

export default GppDelete;
