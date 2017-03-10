import React, {PropTypes, Component} from 'react';
import {Map, fromJS} from 'immutable';
import FormSubmitButton from '../../style/form-submit-button';
import CancelButton from '../../style/cancel-button';
import DeleteButton from '../../style/delete-button';
import AttributesEditor from './attributes-editor/attributes-editor';
import * as geometry from '../../../utils/geometry.js';
import Vertex from '../../../models'

let tableStyle = {
  width: '100%'
};

export default class ElementEditor extends Component {

  constructor(props, context) {
    super(props, context);

    this.state = {
      attributesFormData: this.initAttrData(this.props.element, this.props.layer, this.props.state),
      propertiesFormData: this.initPropData(this.props.element, this.props.layer, this.props.state)
    };

    this.updateAttribute = this.updateAttribute.bind(this);
  }

  initAttrData(element, layer, state) {

    switch (element.prototype) {
      case 'items': {
        return new Map({
          x: element.x,
          y: element.y,
          rotation: element.rotation
        });
      }
      case 'lines': {
        let v_a = this.props.layer.vertices.get(this.props.element.vertices.get('0'));
        let v_b = this.props.layer.vertices.get(this.props.element.vertices.get('1'));

        return new Map({
          vertexOne : v_a,
          vertexTwo : v_b,
          lineLength: geometry.pointsDistance( v_a.x, v_a.y, v_b.x, v_b.y )
        });
      }
      case 'holes': {
        return new Map({
          offset: element.offset
        });
      }
      case 'areas': {
        return new Map({});
      }
      default:
        return null;
    }


  }

  initPropData(element, layer, state) {
    let {catalog} = this.context;
    let catalogElement = catalog.getElement(element.type);

    let mapped = {};
    for (let name in catalogElement.properties) {
      mapped[name] = new Map({
        currentValue: element.properties.has(name) ? element.properties.get(name) : fromJS(curr.defaultValue),
        configs: catalogElement.properties[name]
      });
    }

    return new Map(mapped);
  }

  updateAttribute(AttributeName, value) {
    switch (this.props.element.prototype) {
      case 'items': {
        let {state: {attributesFormData}} = this;
        attributesFormData = attributesFormData.set(AttributeName, value);
        this.setState({attributesFormData});
        break;
      }
      case 'lines': {
        let {state: {attributesFormData}} = this;

        if( AttributeName === 'lineLength' )
        {
          let v_a = attributesFormData.get('vertexOne');
          let v_b = attributesFormData.get('vertexTwo');

          let v_b_new = geometry.extendLine( v_a.x, v_a.y, v_b.x, v_b.y, value );

          //console.log( geometry.orderVertices( [ v_a, v_b  ] ) );

          attributesFormData = attributesFormData.set('vertexTwo', v_b.merge( v_b_new ) );
          attributesFormData = attributesFormData.set(AttributeName, value);
        }
        else
        {
          console.log( AttributeName, value );
          attributesFormData = attributesFormData.set(AttributeName, attributesFormData.get(AttributeName).merge(value));
        }

        this.setState({attributesFormData});
        break;
      }
      case 'holes': {
        let {state: {attributesFormData}} = this;
        attributesFormData = attributesFormData.set(AttributeName, value);
        this.setState({attributesFormData});
        break;
      }
      default:
        break;
    }
  }

  updateProperty(propertyName, value) {
    let {state: {propertiesFormData}} = this;
    propertiesFormData = propertiesFormData.setIn([propertyName, 'currentValue'], value);
    this.setState({propertiesFormData});
  }

  reset() {
    this.setState({propertiesFormData: this.initPropData()});
  }

  save(event) {
    event.preventDefault();
    let {state: {propertiesFormData, attributesFormData}, context: {projectActions}} = this;

    let properties = propertiesFormData.map(data => {
      return data.get('currentValue');
    });

    projectActions.setProperties(properties);
    switch (this.props.element.prototype) {
      case 'items': {
        projectActions.setItemsAttributes(attributesFormData);
        break;
      }
      case 'lines': {
        projectActions.setLinesAttributes(attributesFormData);
        break;
      }
      case 'holes': {
        projectActions.setHolesAttributes(attributesFormData);
        break;
      }
    }
  }

  render() {
    let {
      state: {propertiesFormData, attributesFormData},
      context: {projectActions, catalog, translator},
      props: {state: appState},
    } = this;

    return (
      <form onSubmit={e => this.save(e)}>

        <AttributesEditor element={this.props.element}
                          onUpdate={this.updateAttribute}
                          attributeFormData={attributesFormData}/>

        {propertiesFormData.entrySeq()
          .map(([propertyName, data]) => {

            let currentValue = data.get('currentValue'), configs = data.get('configs');

            let {Editor} = catalog.getPropertyType(configs.type);

            return <Editor
              key={propertyName}
              propertyName={propertyName}
              value={currentValue}
              configs={configs}
              onUpdate={value => this.updateProperty(propertyName, value)}
              state={appState}
            />
          })
        }

        <table style={tableStyle}>
          <tbody>
          <tr>
            <td><DeleteButton size="small"
                              onClick={e => projectActions.remove()}>{translator.t("Delete")}</DeleteButton></td>
            <td><CancelButton size="small" onClick={e => this.reset()}>{translator.t("Reset")}</CancelButton></td>
            <td><FormSubmitButton size="small">{translator.t("Save")}</FormSubmitButton></td>
          </tr>
          </tbody>
        </table>

      </form>
    )
  }

  componentWillReceiveProps(nextProps) {
    this.setState({attributesFormData: this.initAttrData(nextProps.element, nextProps.layer, nextProps.state)});
  }


}

ElementEditor.propTypes = {
  state: PropTypes.object.isRequired,
  element: PropTypes.object.isRequired,
  layer: PropTypes.object.isRequired
};

ElementEditor.contextTypes = {
  projectActions: PropTypes.object.isRequired,
  catalog: PropTypes.object.isRequired,
  translator: PropTypes.object.isRequired,
};