import React, { useState } from 'react';
import { Button, Modal, Table } from 'semantic-ui-react';
import { modalStyles } from '../styles';

function AllRaids(props) {
  const [ isOpen, setIsOpen ] = useState(false);

  function onClose() {
    setIsOpen(false);
  }

  const { raids } = props;

  return (
    <Modal open={isOpen} onClose={onClose} trigger={<Button inverted onClick={() => setIsOpen(true)}>View All Raids</Button>} style={modalStyles} closeIcon>
      <Modal.Header style={modalStyles}>All Raids</Modal.Header>
      <Modal.Content style={modalStyles} scrolling>
      <Table inverted basic='very' celled compact verticalAlign='center'>
        <Table.Header fullWidth>
          <Table.Row>
            <Table.HeaderCell>
              ID
            </Table.HeaderCell>
            <Table.HeaderCell>
              Instances
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
        { raids ? raids.map(raid => (
          <Table.Row key={raid.raid_id}>
            <Table.Cell>{raid.raid_id}</Table.Cell>
            <Table.Cell>{raid && raid.instances && raid.instances.map(it => it.name).join(', ')}</Table.Cell>
          </Table.Row>
        )) : (
          <Table.Row><Table.Cell>Loading...</Table.Cell></Table.Row>
        )}
        </Table.Body>
      </Table>
      <Modal.Actions>
        <Button style={{ marginTop: '5px' }} className={'ui right floated primary button'} onClick={() => onClose()}>Close</Button>
      </Modal.Actions>
      </Modal.Content>
    </Modal>
  );
}

export default AllRaids;
