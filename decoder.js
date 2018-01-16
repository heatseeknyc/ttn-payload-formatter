// Updated 2017-04-20 22:58 EDT tmm@mcci.com -- add Catena 0x14 decoder.
//         2017-04-20 23:08 EDT tmm@mcci.com -- fix typos in comments
//         2018-01-11 17:20 EST tmm@mcci.com -- add Catena 0x15 decoder.

function Decoder(bytes, port) {
  // Decode an uplink message from a buffer
  // (array) of bytes to an object of fields.
  var decoded = {};

  if (port === 1) {
    cmd = bytes[0];
    if (cmd == 250) {
        var i;
        var tempC = new Array(10);
        var error = new Array(10);
        for (i = 0; i < 10; i++) {
            var c = bytes[i + 1];
            error[i] = "none";
            tempC[i] = -100;
            if (c <= 240) {
                /* temperature */
                tempC[i] = c / 4.0 - 10;
            } else if (c == 241) {
                error[i] = "below range";
            } else if (c == 242) {
                error[i] = "above range";
            } else if (c == 243) {
                error[i] = "no sensor";
            } else if (c == 244) {
                error[i] = "bad crc";
            } else if (c >= 245) {
                error[i] = "unknown code";
            }
        }
        decoded.tempC = tempC;
        decoded.error = error;
        /*
         Add other code here...
         tempC[x] is temperature from x hours ago (0 hours ago means now!)
         error[x] is the error for the corresponding time.  We ignore external
         sensors, because we don't expect to have any.
        */
    } else if (cmd == 0x14 || cmd == 0x15) {
        // decode Cantena 4450 M101 data

        // test vectors:
        //  14 01 18 00 ==> vBat = 1.5
        //  14 01 F8 00 ==> vBat = -0.5
        //  14 05 F8 00 42 ==> boot: 66, vBat: -0.5
        //  14 0D F8 00 42 17 80 59 35 80 ==> adds one temp of 23.5, rh = 50, p = 913.48

        // i is used as the index into the message. Start with the flag byte.
        var i = 1;
        // fetch the bitmap.
        var flags = bytes[i++];

        if (flags & 0x1) {
            // set vRaw to a uint16, and increment pointer
            var vRaw = (bytes[i] << 8) + bytes[i + 1];
            i += 2;
            // interpret uint16 as an int16 instead.
            if (vRaw & 0x8000)
                vRaw += -0x10000;
            // scale and save in decoded.
            decoded.vBat = vRaw / 4096.0;
        }

        if (flags & 0x2) {
            var vRaw = (bytes[i] << 8) + bytes[i + 1];
            i += 2;
            if (vRaw & 0x8000)
                vRaw += -0x10000;
            decoded.vBus = vRaw / 4096.0;
        }

        if (flags & 0x4) {
            var iBoot = bytes[i];
            i += 1;
            decoded.boot = iBoot;
        }

        // to avoid confusion, we fake 1 good result and
        // 9 historical bad results... or 0 good results
        // and 10 historical bad results.
        var tempC = new Array(10);
        var error = new Array(10);
        var j;
        for (j = 0; j < 10; ++j) {
            tempC[j] = -100;
            error[j] = "no data";
        }
        if (flags & 0x8) {
            // we have temp, pressure, RH
            var tRaw = (bytes[i] << 8) + bytes[i + 1];
            if (tRaw & 0x8000)
                tRaw = -0x10000 + tRaw;
            i += 2;
            var pRaw = (bytes[i] << 8) + bytes[i + 1];
            i += 2;
            var hRaw = bytes[i++];

            tempC[0] = tRaw / 256;
            error[0] = "none";
            decoded.p = pRaw * 4 / 100.0;
            decoded.rh = hRaw / 256 * 100;
        }
        decoded.tempC = tempC;
        decoded.error = error;

        if (flags & 0x10) {
            // we have lux
            var luxRaw = (bytes[i] << 8) + bytes[i + 1];
            i += 2;
            decoded.lux = luxRaw;
        }
    }
  }
  return decoded;
}