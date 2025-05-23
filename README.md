# node-bluetooth-hci-socket

[![GitHub forks](
https://img.shields.io/github/forks/stoprocent/node-bluetooth-hci-socket.svg?style=social&label=Fork&maxAge=2592000
)](
https://GitHub.com/stoprocent/node-bluetooth-hci-socket/network/
)
[![license](
https://img.shields.io/badge/license-MIT-0.svg
)](MIT)
[![NPM](
https://img.shields.io/npm/v/@stoprocent/bluetooth-hci-socket.svg
)](
https://www.npmjs.com/package/@stoprocent/bluetooth-hci-socket
)

Bluetooth HCI socket binding for Node.js

__NOTE:__ Currently only supports __Linux__, __FreeBSD__, __Windows__ or **any operating systems when using HCI over uart**.

## About This Fork

This fork of `node-bluetooth-hci-socket` exists to introduce several important improvements and address compatibility issues across different operating systems. 

1. **System-independent UART HCI driver**: I have introduced a driver that allows UART HCI dongles to be used seamlessly across any operating system, making the library much more flexible and portable.
   
2. **Rewriting Native Code**: The C++ native binding code has been fully rewritten from **Nan** to **N-API**, ensuring long-term compatibility with modern versions of Node.js. Along with this, I have also resolved numerous issues that plagued the original code, improving both stability and performance.

If you value these contributions and the ongoing maintenance of this project, please consider supporting my work. 

[![Buy me a coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/stoprocent)

## Install

```sh
npm install @stoprocent/bluetooth-hci-socket
```

## Usage

#### Typescript
```typescript
// Default - Auto-selected
import BluetoothHciSocket from "@stoprocent/bluetooth-hci-socket";
// ... or specific driver
import { loadDriver } from "@stoprocent/bluetooth-hci-socket";
```

#### Javascript
```javascript
const BluetoothHciSocket = require('@stoprocent/bluetooth-hci-socket');
```

There are two ways to use this module:

### 1. Default (Automatic) Driver Selection

```javascript
const socket = new BluetoothHciSocket();
```

This will automatically select the appropriate driver based on your platform and environment:
- UART driver if UART port or force UART is configured
- USB driver on Windows/FreeBSD or if force USB is configured
- Native HCI driver on Linux/Android

### 2. Explicit Driver Selection

#### Typescript
``` typescript
import { loadDriver } from "@stoprocent/bluetooth-hci-socket";

const BluetoothHciSocketUart = loadDriver('uart');
const socket = new BluetoothHciSocketUart();
```

#### Javascript
```javascript
const { loadDriver } = require('@stoprocent/bluetooth-hci-socket');

// Choose specific driver
const UartBluetoothHciSocket = loadDriver('uart');
const socket = new UartBluetoothHciSocket();

const UsbBluetoothHciSocket = loadDriver('usb');
const socket = new UsbBluetoothHciSocket();

const NativeBluetoothHciSocket = loadDriver('native');
const socket = new NativeBluetoothHciSocket();
```

Available driver types:
- `'uart'` - UART/Serial driver (works on any OS)
- `'usb'` - USB driver (Windows/FreeBSD)
- `'native'` - Native driver (Linux/Android)

## Prerequisites

 * [node-gyp requirements](https://github.com/TooTallNate/node-gyp#installation)

__NOTE:__ `node-gyp` is only required if the npm cannot find binary for your OS version otherwise the binaries are prebuilt.

### UART/Serial (Any OS)

The reason to use this configuration is more universal transport that can work across multiple operating systems.
Idea is to use Zephyr HCI over UART firmware and to interface with HCI over UART.

##### How to use this?

1. You will need for example `NRF52` module (e.g. `nRF52840 DK` or `nRF52840 USB`) or `ESP32-WROOM-32`
2. Follow the instructions in the [misc/esp32](misc/esp32) for `ESP32` or [misc/nrf52840](misc/nrf52840) for `NRF52840`.
3. Enjoy BLE on any OS.

### Linux

 * Bluetooth 4.0 Adapter

__Note:__ the [node-usb](https://github.com/nonolith/node-usb) dependency might fail install, this is ok, because it is an optional optional dependency. Installing ```libudev-dev``` via your Linux distribution's package manager will resolve the problem.

### Windows

This library needs raw USB access to a Bluetooth 4.0 USB adapter, as it needs to bypass the Windows Bluetooth stack.

A [WinUSB](https://msdn.microsoft.com/en-ca/library/windows/hardware/ff540196(v=vs.85).aspx) driver is required, use [Zadig tool](http://zadig.akeo.ie) to replace the driver for your adapter.

__WARNING:__ This will make the adapter unavailable in Windows Bluetooth settings! To roll back to the original driver go to: ```Device Manager -> Open Device -> Update Driver```
Note: 
- that one should select "Delete the driver software for this device" as per Zadig instructions if the generation of the system restoral point by Zadig fails if one wishes to use restore system restoral point as an option.

#### Compatible Bluetooth 4.0 USB Adapter's

| Name | USB VID | USB PID |
|:---- | :------ | :-------|
| BCM920702 Bluetooth 4.0 | 0x0a5c | 0x21e8 |
| BCM920702 Bluetooth 4.0 | 0x0a5c | 0x21f1 |
| BCM20702A0 Bluetooth 4.0 | 0x19ff | 0x0239 |
| BCM20702A0 Bluetooth 4.0 | 0x0489 | 0xe07a |
| BCM20702A0 Bluetooth 4.0 | 0x413c | 0x8143 |
| CSR8510 A10 | 0x0a12 | 0x0001 |
| Asus BT-400 | 0x0b05 | 0x17cb |
| Intel Wireless Bluetooth 6235 | 0x8087 | 0x07da |
| Intel Wireless Bluetooth 7260 | 0x8087 | 0x07dc |
| Intel Wireless Bluetooth 7265 | 0x8087 | 0x0a2a |
| Intel Wireless Bluetooth 8265 | 0x8087 | 0x0a2b |
| Belkin BCM20702A0 | 0x050D | 0x065A |
| Dell Precision 5530| 0x8087 | 0x0025 |

#### Compatible Bluetooth 4.1 USB Adapter's
| Name | USB VID | USB PID |
|:---- | :------ | :-------|
| BCM2045A0 Bluetooth 4.1 | 0x0a5c | 0x6412 |
| Marvell AVASTAR | 0x1286 | 0x204C |

### Actions

#### Create

```javascript
var bluetoothHciSocket = new BluetoothHciSocket();
```

#### Set Filter

```javascript
var filter = new Buffer(14);

// ...

bluetoothHciSocket.setFilter(filter);
```

__Note:__ ```setFilter``` is not required if ```bindRaw``` is used.

#### Bind

##### Raw Channel

```javascript
bluetoothHciSocket.bindRaw(deviceId); // optional deviceId (integer)
```

##### User Channel

```javascript
bluetoothHciSocket.bindUser(deviceId); // optional deviceId (integer)
```

Requires the device to be in the powered down state (```sudo hciconfig hciX down```).

##### Control Channel

```javascript
bluetoothHciSocket.bindControl();
```

#### Is Device Up

Query the device state.

```
var isDevUp = bluetoothHciSocket.isDevUp(); // returns: true or false
```

__Note:__ must be called after ```bindRaw```.

#### Start/stop

Start or stop event handling:

```javascript
bluetoothHciSocket.start();

// ...

bluetoothHciSocket.stop();
```

__Note:__ must be called after ```bindRaw``` or ```bindControl```.

#### Write

```javascript
var data = new Buffer(/* ... */);

// ...


bluetoothHciSocket.write(data);
```

__Note:__ must be called after ```bindRaw``` or ```bindControl```.

### Events

#### Data

```javascript
bluetoothHciSocket.on('data', function(data) {
  // data is a Buffer

  // ...
});
```

#### Error

```javascript
bluetoothHciSocket.on('error', function(error) {
  // error is a Error

  // ...
});
```

## Examples

See [examples folder](https://github.com/stoprocent/node-bluetooth-hci-socket/blob/master/examples) for code examples.

## Platform Notes

### Linux

#### Force Raw USB mode

Unload ```btusb``` kernel module:

```sh
sudo rmmod btusb
```

Set ```BLUETOOTH_HCI_SOCKET_FORCE_USB``` environment variable:

```sh
sudo BLUETOOTH_HCI_SOCKET_FORCE_USB=1 node <file>.js
```

### FreeBSD

Disable automatic loading of the default Bluetooth stack by putting [no-ubt.conf](https://gist.github.com/myfreeweb/44f4f3e791a057bc4f3619a166a03b87) into ```/usr/local/etc/devd/no-ubt.conf``` and restarting devd (```sudo service devd restart```).

Unload ```ng_ubt``` kernel module if already loaded:

```sh
sudo kldunload ng_ubt
```

### OS X

#### Disable CSR USB Driver

```sh
sudo kextunload -b com.apple.iokit.CSRBluetoothHostControllerUSBTransport
```

#### Disable Broadcom USB Driver

```sh
sudo kextunload -b com.apple.iokit.BroadcomBluetoothHostControllerUSBTransport
```

### Windows

#### Force adapter USB VID and PID

Set ```BLUETOOTH_HCI_SOCKET_USB_VID``` and ```BLUETOOTH_HCI_SOCKET_USB_PID``` environment variables.

Example for USB device id: 050d:065a:

```sh
set BLUETOOTH_HCI_SOCKET_USB_VID=0x050d
set BLUETOOTH_HCI_SOCKET_USB_PID=0x065a

node <file>.js
```
