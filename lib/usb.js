const events = require('events');
const util = require('util');

const debug = require('debug')('hci-usb');
const { usb, findByIds, getDeviceList } = require('usb');

const HCI_COMMAND_PKT = 0x01;
const HCI_ACLDATA_PKT = 0x02;
const HCI_EVENT_PKT = 0x04;

const OGF_HOST_CTL = 0x03;
const OCF_RESET = 0x0003;

const VENDOR_DEVICE_LIST = [
  { vid: 0x0CF3, pid: 0xE300 }, // Qualcomm Atheros QCA61x4
  { vid: 0x0a5c, pid: 0x21e8 }, // Broadcom BCM20702A0
  { vid: 0x0a5c, pid: 0x21f1 }, // Broadcom BCM20702A0
  { vid: 0x19ff, pid: 0x0239 }, // Broadcom BCM20702A0
  { vid: 0x413c, pid: 0x8143 }, // Broadcom BCM20702A0
  { vid: 0x0a12, pid: 0x0001 }, // CSR
  { vid: 0x0b05, pid: 0x17cb }, // ASUS BT400
  { vid: 0x8087, pid: 0x07da }, // Intel 6235
  { vid: 0x8087, pid: 0x07dc }, // Intel 7260
  { vid: 0x8087, pid: 0x0a2a }, // Intel 7265
  { vid: 0x8087, pid: 0x0a2b }, // Intel 8265
  { vid: 0x0489, pid: 0xe07a }, // Broadcom BCM20702A1
  { vid: 0x0a5c, pid: 0x6412 }, // Broadcom BCM2045A0
  { vid: 0x050D, pid: 0x065A }, // Belkin BCM20702A0
  { vid: 0x1286, pid: 0x204C }, // Marvell AVASTAR
  { vid: 0x8087, pid: 0x0025 } // Dell Precision 5530
];

function BluetoothHciSocket () {
  this._isUp = false;

  this._hciEventEndpointBuffer = Buffer.alloc(0);
  this._aclDataInEndpointBuffer = Buffer.alloc(0);
  
  this._exitHandler = this.reset.bind(this);
}

util.inherits(BluetoothHciSocket, events.EventEmitter);

BluetoothHciSocket.prototype.setFilter = function (filter) {
  // no-op
};

BluetoothHciSocket.prototype.bindRaw = function (devId, params) {
  this.bindUser(devId, params);
  this._mode = 'raw';
  this.reset();
};

BluetoothHciSocket.prototype.bindUser = function (devId, params) {
  this._mode = 'user';

  const usbParams = this._getUsbParams(params);

  if (Number.isInteger(usbParams.usb.vid) && Number.isInteger(usbParams.usb.pid)) {
    debug('using USB VID = ' + usbParams.usb.vid + ', PID = ' + usbParams.usb.pid);

    if (Number.isInteger(usbParams.usb.bus) && Number.isInteger(usbParams.usb.address)) {
      debug('using USB BUS = ' + usbParams.usb.bus + ', Address = ' + usbParams.usb.address);

      this._usbDevice = this._findUsbDevice(0, usbParams);
    } else {
      this._usbDevice = this._findUsbDevice(devId, usbParams);
    }
  } else {
    this._usbDevice = VENDOR_DEVICE_LIST.map((d) => findByIds(d.vid, d.pid)).find((d) => d != null);
  }

  if (!this._usbDevice) {
    throw new Error('No compatible USB Bluetooth 4.0 device found!');
  }

  this._usbDevice.open();

  this._usbDeviceInterface = this._usbDevice.interfaces[0];

  this._aclDataOutEndpoint = this._usbDeviceInterface.endpoint(0x02);
  if (this._aclDataOutEndpoint === undefined) this._aclDataOutEndpoint = this._usbDeviceInterface.endpoint(0x01);

  this._hciEventEndpoint = this._usbDeviceInterface.endpoint(0x81);
  this._aclDataInEndpoint = this._usbDeviceInterface.endpoint(0x82);

  this._usbDeviceInterface.claim();
};

BluetoothHciSocket.prototype._getUsbParams = function (params) {
  const usbParams = {
    usb: {
      vid: undefined,
      pid: undefined,
      bus: undefined,
      address: undefined
    }
  };

  if (process.env.BLUETOOTH_HCI_SOCKET_USB_VID) {
    usbParams.usb.vid = parseInt(process.env.BLUETOOTH_HCI_SOCKET_USB_VID, 10);
  }
  if (process.env.BLUETOOTH_HCI_SOCKET_USB_PID) {
    usbParams.usb.pid = parseInt(process.env.BLUETOOTH_HCI_SOCKET_USB_PID, 10);
  }
  if (process.env.BLUETOOTH_HCI_SOCKET_USB_BUS) {
    usbParams.usb.bus = parseInt(process.env.BLUETOOTH_HCI_SOCKET_USB_BUS, 10);
  }
  if (process.env.BLUETOOTH_HCI_SOCKET_USB_ADDRESS) {
    usbParams.usb.address = parseInt(process.env.BLUETOOTH_HCI_SOCKET_USB_ADDRESS, 10);
  }

  if (params && params.usb) {
    if (Number.isInteger(params.usb.vid)) {
      usbParams.usb.vid = params.usb.vid;
    }
    if (Number.isInteger(params.usb.pid)) {
      usbParams.usb.pid = params.usb.pid;
    }
    if (Number.isInteger(params.usb.bus)) {
      usbParams.usb.bus = params.usb.bus;
    }
    if (Number.isInteger(params.usb.address)) {
      usbParams.usb.address = params.usb.address;
    }
  }

  return usbParams;
};

BluetoothHciSocket.prototype._findUsbDevice = function (devId, usbParams) {
  const usbDevices = getDeviceList();

  for (let i = 0; i < usbDevices.length; i++) {
    const usbDevice = usbDevices[i];
    const usbDeviceDesc = usbDevice.deviceDescriptor;

    if (Number.isInteger(usbParams.usb.vid) && usbDeviceDesc.idVendor !== usbParams.usb.vid) {
      continue;
    }
    if (Number.isInteger(usbParams.usb.pid) && usbDeviceDesc.idProduct !== usbParams.usb.pid) {
      continue;
    }
    if (Number.isInteger(usbParams.usb.bus) && usbDevice.bus !== usbParams.usb.bus) {
      continue;
    }
    if (Number.isInteger(usbParams.usb.address) && usbDevice.address !== usbParams.usb.address) {
      continue;
    }
    if (--devId > 0) {
      continue;
    }

    return usbDevices[i];
  }
};

BluetoothHciSocket.prototype.getDeviceList = function () {
  return getDeviceList()
    .filter(dev => {
      return VENDOR_DEVICE_LIST.findIndex(d => {
        return dev.deviceDescriptor.idVendor === d.vid && dev.deviceDescriptor.idProduct === d.pid;
      }) !== -1;
    })
    .map(dev => ({
      devId: null,
      devUp: null,
      idVendor: dev.deviceDescriptor.idVendor,
      idProduct: dev.deviceDescriptor.idProduct,
      busNumber: dev.busNumber,
      deviceAddress: dev.deviceAddress
    }));
};

BluetoothHciSocket.prototype.bindControl = function () {
  this._mode = 'control';
};

BluetoothHciSocket.prototype.isDevUp = function () {
  return this._isUp;
};

BluetoothHciSocket.prototype.start = function () {
  if (this._mode === 'raw' || this._mode === 'user') {
    process.on('exit', this._exitHandler);

    this._hciEventEndpoint.removeAllListeners();
    this._hciEventEndpoint.on('data', this.onHciEventEndpointData.bind(this));
    this._hciEventEndpoint.on('error', (error) => {
      debug('HCI event endpoint error: ' + error);
      this.emit('error', error);
    });
    this._hciEventEndpoint.startPoll();

    this._aclDataInEndpoint.removeAllListeners();
    this._aclDataInEndpoint.on('data', this.onAclDataInEndpointData.bind(this));
    this._aclDataInEndpoint.on('error', (error) => {
      debug('ACL data in endpoint error: ' + error);
      this.emit('error', error);
    });
    this._aclDataInEndpoint.startPoll();
  }
};

BluetoothHciSocket.prototype.stop = function () {
  process.removeListener('exit', this._exitHandler);
  if (this._mode === 'raw' || this._mode === 'user') {
    this._hciEventEndpoint.stopPoll();
    this._hciEventEndpoint.removeAllListeners();

    this._aclDataInEndpoint.stopPoll();
    this._aclDataInEndpoint.removeAllListeners();
  }
};

BluetoothHciSocket.prototype.write = function (data) {
  debug('write: ' + data.toString('hex'));

  if (this._mode === 'raw' || this._mode === 'user') {
    const type = data.readUInt8(0);

    if (HCI_COMMAND_PKT === type) {
      this._usbDevice.controlTransfer(
        usb.LIBUSB_REQUEST_TYPE_CLASS | usb.LIBUSB_RECIPIENT_INTERFACE,
        0,
        0,
        0,
        data.slice(1),
        (error) => {
          if (error) {
            debug('Control transfer failed: ' + error);
            this.emit('error', error);
          }
        }
      );
    } else if (HCI_ACLDATA_PKT === type) {
      this._aclDataOutEndpoint.transfer(data.slice(1), (error) => {
        if (error) {
          debug('ACL data transfer failed: ' + error);
          this.emit('error', error);
        }
      });
    }
  }
};

BluetoothHciSocket.prototype.onHciEventEndpointData = function (data) {
  debug('HCI event: ' + data.toString('hex'));

  if (data.length === 0) {
    return;
  }

  // add to buffer
  this._hciEventEndpointBuffer = Buffer.concat([
    this._hciEventEndpointBuffer,
    data
  ]);

  if (this._hciEventEndpointBuffer.length < 2) {
    return;
  }

  // check if desired length
  const pktLen = this._hciEventEndpointBuffer.readUInt8(1);
  if (pktLen <= (this._hciEventEndpointBuffer.length - 2)) {
    const buf = this._hciEventEndpointBuffer.slice(0, pktLen + 2);

    // Skip first reset even after restart
    if (this._isUp === true) {
      // fire event
      this.emit('data', Buffer.concat([
        Buffer.from([HCI_EVENT_PKT]),
        buf
      ]));
    }

    if (this._mode === 'raw' && buf.length === 6 && (buf.toString('hex') === '0e0401030c00' || buf.toString('hex') === '0e0402030c00')) {
      debug('reset complete');
      this._isUp = true;
      this.emit('state', this._isUp);
    }

    // reset buffer
    this._hciEventEndpointBuffer = this._hciEventEndpointBuffer.slice(pktLen + 2);
  }
};

BluetoothHciSocket.prototype.onAclDataInEndpointData = function (data) {
  debug('ACL Data In: ' + data.toString('hex'));

  if (data.length === 0) {
    return;
  }

  // add to buffer
  this._aclDataInEndpointBuffer = Buffer.concat([
    this._aclDataInEndpointBuffer,
    data
  ]);

  if (this._aclDataInEndpointBuffer.length < 4) {
    return;
  }

  // check if desired length
  const pktLen = this._aclDataInEndpointBuffer.readUInt16LE(2);
  if (pktLen <= (this._aclDataInEndpointBuffer.length - 4)) {
    const buf = this._aclDataInEndpointBuffer.slice(0, pktLen + 4);

    // fire event
    this.emit('data', Buffer.concat([
      Buffer.from([HCI_ACLDATA_PKT]),
      buf
    ]));

    // reset buffer
    this._aclDataInEndpointBuffer = this._aclDataInEndpointBuffer.slice(pktLen + 4);
  }
};

BluetoothHciSocket.prototype.reset = function () {
  const cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(OCF_RESET | OGF_HOST_CTL << 10, 1);

  // length
  cmd.writeUInt8(0x00, 3);

  debug('reset');
  this.write(cmd);
};

module.exports = BluetoothHciSocket;
