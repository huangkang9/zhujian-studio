import test from 'node:test';import assert from 'node:assert/strict';
import {detectLines,pixelToWorld} from '../public/studio/trace.js';
function image(w,h){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4).fill(255)};}
function ink(im,x,y){for(let i=0;i<3;i++)im.data[(y*im.width+x)*4+i]=0;}
test('local line extraction actually finds the four strokes of a raster rectangle',()=>{const im=image(160,140);for(let x=20;x<=140;x++)for(const y of [20,21,119,120])ink(im,x,y);for(let y=20;y<=120;y++)for(const x of [20,21,139,140])ink(im,x,y);const lines=detectLines(im,{minLength:50});assert.equal(lines.length,4);assert.equal(lines.filter(l=>Math.abs(l.a.x-l.b.x)<1).length,2);assert.equal(lines.filter(l=>Math.abs(l.a.y-l.b.y)<1).length,2);});
test('blank images produce no invented geometry and short text-like marks are rejected',()=>{const im=image(160,140);assert.equal(detectLines(im).length,0);for(let x=40;x<49;x++)for(let y=40;y<45;y++)ink(im,x,y);assert.equal(detectLines(im,{minLength:40}).length,0);});
test('pixel coordinates correctly account for calibrated scale and photo rotation',()=>{const bg={x:0,y:0,w:1000,h:2000,rotation:90};assert.deepEqual(pixelToWorld({x:0,y:0},bg,100,200),{x:1500,y:500});assert.deepEqual(pixelToWorld({x:50,y:100},bg,100,200),{x:500,y:1000});});
