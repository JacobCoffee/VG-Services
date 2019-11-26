import React, { useState } from 'react';
import axios from 'axios';
import { Button, Modal, Form, Message } from 'semantic-ui-react';
import { modalStyles } from '../styles';

function RaidUpload(props) {
  const [ uploadFailed, setUploadFailed ] = useState(null);
  const [ isOpen, setIsOpen ] = useState(false);

  const [ file, setFile ] = useState();

  function upload() {
    if(!file) { return; }

    const formData = new FormData();
    formData.append('raids', file);

    axios.post('/api/raid/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    .then(result => {
      // FIXME: Make the summary reload dynamically instead of this jank
      window.location.reload(false); 
      onClose();
    })
    .catch(err => setUploadFailed(extractErrors(err.response)))
  }

  function extractErrors(response) {
    const errors = [];
    if(response && response.data) {
      if(response.data.raidError) {
        errors.push(...response.data.raidError.errors);
      }

      if(response.data.guildMemberError) {
        errors.push(...response.data.guildMemberError.errors);
      }
      
      if(response.data.message) {
        errors.push(response.data.message);
      }
    }

    return errors.length? errors : [ 'Unknown error occurred' ];
  }

  function onClose() {
    setFile(null);
    setIsOpen(false);
    setUploadFailed(null);
  }

  return (
    <Modal open={isOpen} onClose={onClose} trigger={<Button inverted onClick={() => setIsOpen(true)}>Upload Raid</Button>} style={modalStyles} closeIcon>
      <Modal.Header style={modalStyles}>Upload Raid</Modal.Header>
      <Modal.Content style={modalStyles} scrolling>
      <Form inverted error={!!uploadFailed}>
        <Form.Field>
          <Button secondary as="label" htmlFor="raid_file_upload" type="button">
            {file ? `Selected file: ${file.name}` : 'Click to Choose Raid File'}
          </Button>
          <input type="file" id="raid_file_upload" hidden onChange={(evt) => {
            setFile(evt.target.files[0])
          }} />
        </Form.Field>
        <Message
          error
          header='Invalid raid file'
          content={`Errors: ${uploadFailed}`}
        />
      </Form>
      <Modal.Actions>
        <Button style={{ marginTop: '5px' }} className={'ui right floated primary button'} onClick={() => upload()}>Submit</Button>
      </Modal.Actions>
      </Modal.Content>
    </Modal>
  );
}

export default RaidUpload;
