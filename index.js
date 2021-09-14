
function mse() {
    const playerInstance = function () {
        this.isPlaying = false;
        this.streamingStarted = false;
        this.ms = null;
        this.queue = [];
        this.ws = null;
        this.sourceBuffer;
        this.livestream = document.getElementById("livestream");
        this.suuid = "tennis90.main.360p";
        this.mimeCodec = 'video/mp4; codecs="avc1.42E01F, mp4a.40.2"';
        this.firstFlag = false;
        this.initialize = () => {
            if ('MediaSource' in window) {
                this.ms = new MediaSource();
                this.ws = new WebSocket("ws://127.0.0.1:3001");
                this.ws.binaryType = "arraybuffer";
                
                // this.ms.addEventListener('sourceopen', this.start(), false);
                this.livestream.src = window.URL.createObjectURL(this.ms);
                this.livestream.onpause = () => {
                    console.log("The video has been paused");
                    this.stop();
                };
                this.livestream.onplay = () => {
                    console.log("The video has been started");
                    // функция для отправки команды ping на сервер
                    // function wsSendPing() {
                    //     this.ws.send(JSON.stringify({action: 'PING'}));
                    // }
                    // wsSendPing();
                    if (this.isPlaying === false) {
                        this.start();
                    }
                };
                this.ms.addEventListener('sourceopen', this.start(), false);
    
            } else {
                console.error("Unsupported MSE");
            }
        };

        // this.play = () => {
        //     this.ms.addEventListener('sourceopen', this.start(), false);
        // }

        
        this.start = () => {
            this.isPlaying = true;
            this.ms.readyState = 'open';
            // this.sourceBuffer = this.ms.addSourceBuffer('video/mp4; codecs="avc1.42E01F, mp4a.40.2"');
            // this.sourceBuffer.addEventListener("updateend", this.loadPacket, false);
            this.ws.onopen = (event) => {
                console.log('Socket opened', event);
                console.log('completed');
                this.sourceBuffer = this.ms.addSourceBuffer(this.mimeCodec);
                // this.sourceBuffer.mode = "segments";
                // console.log(this.ms.readyState);
            }
            this.ws.onclose = (event) => {
                console.log('Socket closed', event);
                if (this.isPlaying === true) {
                    setTimeout(() => {
                        // this.start();
                    }, 1000);
                }
            }
            this.ws.onerror = (err) => {
                console.error('Socket encountered error: ', err.message, 'Closing socket');
                this.ws.close();
            };
            this.ws.onmessage = (event) => {
                const data = new Uint8Array(event.data);
                // console.log(this.firstFlag);
                if (this.firstFlag === false) {
                    // this.loadPacket();
                    this.firstFlag = this.hasFirstSampleFlag(data);
                    // console.log(data);
                }

                if (this.firstFlag === true) { 
                    // if (this.queue.length > 0) {
                    //     // this.sourceBuffer = this.ms.addSourceBuffer('video/mp4; codecs="avc1.42E01F, mp4a.40.2"');
                    //     // this.sourceBuffer.mode = "sequence";
                    //     this.sourceBuffer.addEventListener("updateend", this.loadPacket);
                    // } else {
                        this.pushPacket(event.data);
                    // }
                }

                // console.log('Message:', event.data);
                // if (this.queue.length > 0) {
                //     let decoded_arr = data.slice(1);
                //     let mimeCodec;
                //     if (window.TextDecoder) {
                //         mimeCodec = new TextDecoder("utf-8").decode(decoded_arr);
                //     } else {
                //         //mimeCodec =Utf8ArrayToStr(decoded_arr);
                //         mimeCodec = String.fromCharCode(decoded_arr);
                //     }
                //     if (this.verbose) {
                //         console.log('first packet with codec data: ' + mimeCodec);
                //     }
                //     if (!this.sourceBuffer && this.livestream) {
                //         // this.sourceBuffer = this.ms.addSourceBuffer('video/mp4; codecs="avc1.42E01F, mp4a.40.2"');
                //         // this.sourceBuffer.mode = "segments";
                //         this.sourceBuffer.addEventListener("updateend", this.loadPacket);
                //     }
                // } else {
                    
                //     this.pushPacket(event.data);
                // }
            };
        };

        function toInt(arr, index) { // From bytes to big-endian 32-bit integer.  Input: Uint8Array, index
            var dv = new DataView(arr.buffer, 0);
            return dv.getInt32(index, false); // big endian
        }

        function toString(arr, fr, to) { // From bytes to string.  Input: Uint8Array, start index, stop index.
            // https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
            return String.fromCharCode.apply(null, arr.slice(fr,to));
        }

        function getBox(arr, i) { // input Uint8Array, start index
            return [toInt(arr, i), toString(arr, i+4, i+8)]
        }

        this.getSubBox = (arr, box_name) => {
            var i = 0;
                res = getBox(arr, i);
                main_length = res[0]; let name = res[1]; // this boxes length and name
                i = i + 8;
                
                var sub_box = null;
                
                while (i < main_length) {
                    res = getBox(arr, i);
                    l = res[0]; name = res[1];
                    
                    if (box_name == name) {
                        sub_box = arr.slice(i, i+l)
                    }
                    i = i + l;
                }
            return sub_box;
        };

        this.hasFirstSampleFlag = (arr) => {
            // console.log(arr);
            var traf = getSubBox(arr, "traf");
            if (traf==null) { return false; }
                
            var trun = getSubBox(traf, "trun");
            if (trun==null) { return false; }
            
            // ISO/IEC 14496-12:2012(E) .. pages 5 and 57
            // bytes: (size 4), (name 4), (version 1 + tr_flags 3)
            var flags = trun.slice(10,13); // console.log(flags);
            f = flags[1] & 4; // 
            console.log(f);
            // console.log('okok');
            // this.sourceBuffer.addEventListener("updateend", this.loadPacket);
            return f == 4;
        };

        this.stop = () => {
            this.isPlaying = false;
            if (this.ws) {
                this.ws.close();
                if (this.livestream && this.sourceBuffer) {
                    this.sourceBuffer.abort();
                    if (this.livestream.currentTime > 0) {
                        this.sourceBuffer.remove(0, this.livestream.currentTime);
                    }
                    this.livestream.currentTime = 0
                }
            }
        };
        this.pushPacket = (arr) => {
            let view = new Uint8Array(arr);
            // console.log('push event.data:', arr);
            if (this.verbose) {
                console.log("got", arr.byteLength, "bytes.  Values=", view[0], view[1], view[2], view[3], view[4]);
            }
            let data = arr;
            
            if (!this.streamingStarted && this.livestream) {
                console.log('data: ',data);
                this.streamingStarted = true;
                this.sourceBuffer.appendBuffer(data);
                
                this.queue.push(data);
                // this.firstFlag = false;
                return;
            }
            this.queue.push(data);
            if (this.verbose) {
                console.log("queue push:", this.queue.length);
            }
            if (!this.sourceBuffer.updating) {
                this.loadPacket();
            }
        };
        this.loadPacket = () => {
            if (!this.sourceBuffer.updating && this.livestream) {
                if (this.queue.length > 0) {
                    let inp = this.queue.shift();
                    if (this.verbose) {
                        console.log("queue PULL:", this.queue.length);
                    }
                    let view = new Uint8Array(inp);
                    if (this.verbose) {
                        console.log("writing buffer with", view[0], view[1], view[2], view[3], view[4]);
                    }
                    // console.log(inp);
                    this.sourceBuffer.appendBuffer(inp);
                } else {
                    this.streamingStarted = false;
                }
            }
        }
        return this;
    }
    
    const player = playerInstance();
    player.initialize();
}
mse();


// window.onload = msePlayer();


        
        
        // function msePlayer() {
        //     const playerInstance = function () {
        //         this.isPlaying = false;
        //         this.streamingStarted = false;
        //         this.ms = null;
        //         this.queue = [];
        //         this.ws = null;
        //         this.sourceBuffer = null;
        //         this.livestream = document.getElementById("livestream");
        //         this.suuid = "tennis90.main.360p";
        //         this.initialize = () => {
        //             if ('MediaSource' in window) {
        //                 this.ms = new MediaSource();
        //                 this.ms.addEventListener('sourceopen', this.start(), false);
        //                 this.livestream.src = window.URL.createObjectURL(this.ms);
        //                 this.livestream.onpause = () => {
        //                     console.log("The video has been paused");
        //                     this.stop();
        //                 };
        //                 this.livestream.onplay = () => {
        //                     console.log("The video has been started");
        //                     // функция для отправки команды ping на сервер
        //                     function wsSendPing() {
        //                         this.ws.send(JSON.stringify({action: 'PING'}));
        //                     }
        //                     wsSendPing();
        //                     if (this.isPlaying === false) {
        //                         this.start();
        //                     }
        //                 };

        //             } else {
        //                 console.error("Unsupported MSE");
        //             }
        //         };
        //         this.start = () => {
        //             this.isPlaying = true;
        //             this.ws = new WebSocket("ws://127.0.0.1:3001", "rust-websocket");
        //             this.ws.binaryType = "arraybuffer";
        //             this.ws.onopen = (event) => {
        //                 console.log('Socket opened', event);
        //                 console.log('completed');
        //             }
        //             this.ws.onclose = (event) => {
        //                 console.log('Socket closed', event);
        //                 if (this.isPlaying === true) {
        //                     setTimeout(() => {
        //                         // this.start();
        //                     }, 1000);
        //                 }
        //             }
        //             this.ws.onerror = (err) => {
        //                 console.error('Socket encountered error: ', err.message, 'Closing socket');
        //                 this.ws.close();
        //             };
        //             this.ws.onmessage = (event) => {
        //                 const data = new Uint8Array(event.data);
        //                 console.log('Message:', event.data);
        //                 if (data[0] === 9) {
        //                     console.log('no pushPacket')
        //                     let decoded_arr = data.slice(1);
        //                     let mimeCodec;
        //                     if (window.TextDecoder) {
        //                         mimeCodec = new TextDecoder("utf-8").decode(decoded_arr);
        //                     } else {
        //                         //mimeCodec =Utf8ArrayToStr(decoded_arr);
        //                         mimeCodec = String.fromCharCode(decoded_arr);
        //                     }
        //                     if (this.verbose) {
        //                         console.log('first packet with codec data: ' + mimeCodec);
        //                     }
        //                     if (!this.sourceBuffer && this.livestream) {
        //                         this.sourceBuffer = this.ms.addSourceBuffer('video/mp4; codecs="' + mimeCodec + '"');
        //                         this.sourceBuffer.mode = "segments";
        //                         this.sourceBuffer.addEventListener("updateend", this.loadPacket);
        //                     }
        //                 } else {
        //                     console.log('pushPacket+');
        //                     this.pushPacket(event.data);
        //                 }
        //             };
                    
        //                 // функция для отправки echo-сообщений на сервер
        //                 // function wsSendEcho(value) {
        //                 //     this.ws.send(JSON.stringify({action: 'ECHO', data: value.toString()}));
        //                 // }
                        
                        
        //         };
        //         this.stop = () => {
        //             this.isPlaying = false;
        //             if (this.ws) {
        //                 this.ws.close();
        //                 if (this.livestream && this.sourceBuffer) {
        //                     this.sourceBuffer.abort();
        //                     if (this.livestream.currentTime > 0) {
        //                         this.sourceBuffer.remove(0, this.livestream.currentTime);
        //                     }
        //                     this.livestream.currentTime = 0
        //                 }
        //             }
        //         };
        //         this.pushPacket = (arr) => {
        //             let view = new Uint8Array(arr);
        //             console.log('push event.data:', arr);
        //             if (this.verbose) {
        //                 console.log("got", arr.byteLength, "bytes.  Values=", view[0], view[1], view[2], view[3], view[4]);
        //             }
        //             let data = arr;
        //             if (!this.streamingStarted && this.livestream) {
        //                 this.sourceBuffer.appendBuffer(data);
        //                 this.streamingStarted = true;
        //                 return;
        //             }
        //             this.queue.push(data);
        //             if (this.verbose) {
        //                 console.log("queue push:", this.queue.length);
        //             }
        //             if (!this.sourceBuffer.updating) {
        //                 this.loadPacket();
        //             }
        //         };
        //         this.loadPacket = () => {
        //             if (!this.sourceBuffer.updating && this.livestream) {
        //                 if (this.queue.length > 0) {
        //                     let inp = this.queue.shift();
        //                     if (this.verbose) {
        //                         console.log("queue PULL:", this.queue.length);
        //                     }
        //                     let view = new Uint8Array(inp);
        //                     if (this.verbose) {
        //                         console.log("writing buffer with", view[0], view[1], view[2], view[3], view[4]);
        //                     }
        //                     this.sourceBuffer.appendBuffer(inp);
        //                 } else {
        //                     this.streamingStarted = false;
        //                 }
        //             }
        //         }
        //         return this;
        //     }

        //     const player = playerInstance();
        //     player.initialize();
        // }

        // window.onload = () => {msePlayer()};