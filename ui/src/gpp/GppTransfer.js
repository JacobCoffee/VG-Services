import React, { useState } from 'react';
import axios from 'axios';
import { Button, Icon, Modal, Form, Message } from 'semantic-ui-react';
import { modalStyles } from '../styles';
import GuildSearch from '../components/GuildSearch';

function GppTransfer(props) {
  const [ transferFailed, setTransferFailed ] = useState(false);
  const [ transferPlayer, setTransferPlayer ] = useState();
  const [ transferGpp, setTransferGpp ] = useState();
  const [ isOpen, setIsOpen ] = useState(false);

  const { guild, icon, playerEvent } = props;

  function submit() {
    axios.post(`/api/player_event/transfer/${playerEvent.id}`, null, {
      params: {
        player: transferPlayer,
        gpp: transferGpp
      }
    })
    .then(result => {
      props.handler && props.handler(result.data)
      onClose();
    })
    .catch(err => setTransferFailed(extractError(err.response)))
  }

  function extractError(response) {
    return (response && response.data && response.data.message) || 'Unknown error occurred';
  }

  function onClose() {
    setTransferFailed(false);
    setTransferPlayer(null);
    setTransferGpp(null);
    setIsOpen(false);
  }

  if(!playerEvent) {
    return null;
  }
  
  // Set initial states
  if(!transferPlayer) {
    setTransferPlayer(playerEvent.player_name)
  }

  if(transferGpp == null || transferGpp === '') {
    setTransferGpp(playerEvent.gpp);
  }

  const trigger =  icon ?
    <Icon name='exchange' style={{ cursor: 'pointer' }} onClick={() => setIsOpen(true)} /> :
    <Button inverted onClick={() => setIsOpen(true)}>Transfer GPP Event</Button>;

  return (
    <Modal open={isOpen} onClose={onClose} trigger={trigger} style={modalStyles} closeIcon>
      <Modal.Header style={modalStyles}>Transfer GPP Event</Modal.Header>
      <Modal.Content style={modalStyles} scrolling>
      <Form inverted error={transferFailed}>
        <Form.Field>
          <label>Player Name</label>
          <GuildSearch guild={guild} value={transferPlayer} onChange={(player_name) => setTransferPlayer(player_name)} />
        </Form.Field>
        <Form.Field type='number'>
          <label>New GPP Value (negative, if spending)</label>
          <input type='number' placeholder='GPP Change' value={transferGpp} onChange={(evt) => setTransferGpp(evt.target.value)} />
        </Form.Field>
        <Message
          error
          header='Error transferring item'
          content={`Errors: ${transferFailed}`}
        />
      </Form>
      <Modal.Actions>
        <Button style={{ marginTop: '5px' }} className={'ui right floated primary button'} onClick={() => submit()}>Submit</Button>
      </Modal.Actions>
      </Modal.Content>
    </Modal>
  );
}

export default GppTransfer;