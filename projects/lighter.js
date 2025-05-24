/*

This file has the majority of the lighting code we use in Mirastell (sample is from Version 2.1.11 - 3/15/21).

Our lighting implementation is really unique, and is custom built to work with the game's art style, so I basically had to figure out how to create these effects completely by myself, with no help from outside resources.


Here's how it works:

1) We create a lighting mask, which is a sprite which we can draw an image onto and display over the game world. This sprite is managed by the lightMaskMap, which stores the mask, as well as some other useful data.

2) We use GPU.js (https://gpu.rocks) to transpile a JavaScript raytracing function into C++ code, which we can compile into a kernel and run on the GPU (for improved performance).

3) We run the kernel on each static light to find out how that light affects its environment, and then combine the results from each static light into one array. Essentially we're running a lighting bake while the level loads.

4) Each frame, we run the kernel on the dynamic lights, and mix in the baked lighting data we have saved.

5) We run some post processing, and then use an HTML5 canvas to create RGBA data at the resolution the user has chosen for their shadows.

6) We use that data to generate an image, and then apply the image to the shadow mask sprite and scale it to be the correct resolution, and cover the screen.

*/

class lightMaskMap { // This tracks all the data that we need to render the mask over the game world
    constructor(width, height, resolution, group) {
        this.width = width;
        this.height = height;
        this.resolution = resolution;
        this.worldTileWidth = Math.ceil(this.width / (128 / this.resolution));
        this.worldTileHeight = Math.ceil(this.height / (128 / this.resolution));
        this.prevCameraCoords = [0, 0];

        // We use an HTML5 canvas context to create the mask image
        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext("2d");
        // this.ctx.canvas.width = width;
        // this.ctx.cavas.height = height;
        console.log(width + " " + height);
        // We use the context element to build the rgba data and then store it in a 2d array
        this.imgData = this.ctx.createImageData(width, height);
        for (var i = 0; i < this.imgData.data.length; i++) {
            this.imgData.data[i] = 0;
        }

        // Once we have the mask image data we can add it into a sprite and scale it up to cover the screen
        this.sprite = game.add.sprite(0, 0, this.bitMap);
        this.sprite.scale.setTo(resolution, resolution);
        // this.sprite.anchor.setTo(0.5, 0.5);
        group.add(this.sprite);
    }

    reposition() { // Repositions the mask sprite to match with the camera's position
        var oldSpriteCoords = [this.sprite.x, this.sprite.y];

        this.sprite.x = Math.floor((game.camera.x) / this.resolution) * this.resolution;
        this.sprite.y = Math.floor((game.camera.y) / this.resolution) * this.resolution;

        if (this.sprite.x != oldSpriteCoords[0] || this.sprite.y != oldSpriteCoords[1]) {
            // Force re-calc of light if one was not scheduled
            lightSkipFrameCounter = lightSkipFrames;
        }
    }

    // Resets the mask map
    clearLighting() {
        for (var i = 0; i < this.width; i++) {
            this.tiles.push([]);
            for (var j = 0; j < this.height; j++) {
                this.tiles[i][j].alpha = 0;
            }
        }
    }

    // Removes the mask map sprite and frees up the memory it was using
    destroy() {
        this.sprite.destroy(true);
        
        this.width = undefined;
        this.height = undefined;
        this.resolution = undefined;
        this.worldTileWidth = undefined;
        this.worldTileHeight = undefined;
        this.prevCameraCoords = undefined;
        this.canvas = undefined;
        this.ctx = undefined;
        this.imgData = undefined;
    }
}

var lightSettings = {
    resolution: 8,
    brightness: 20,
    viewDist: 40,
    shadowDarknessFactor: 1,
    blend: false,
    showBakedLights: true
}

var enableDynamicLighting = false;

const gpu = new GPU({
    mode:'webgl2'
});

var lightBlockingTiles = [
    [6, 21],
    // [76, 78],
    [90, 100],
    [64, 65],
    [216, 236],
    [257, 258],
    // [286, 288],
    [307, 307],
    [426, 523],
    // [496, 468]
];

// The JS code that will be transpiled into C++ and used as a GPU kernel
function raytraceBaseFunction(worldTiles, resolution, playerCoord, cameraCoords, lightIntensity, viewBubble) {
    var resolutionOffset = resolution / 32;

    // Find start location and cast ray towards the player
    var rayStartCoord = [(this.thread.y + Math.floor(cameraCoords[0] / resolution)) * resolution + resolution / 2, (this.thread.x + Math.floor(cameraCoords[1] / resolution)) * resolution + resolution / 2];
    var castStepLen = Math.floor(Math.abs(Math.sqrt(Math.pow(rayStartCoord[0] - playerCoord[0], 2) + Math.pow(rayStartCoord[1] - playerCoord[1], 2)) / resolution));

    var initTile = worldTiles[Math.floor(rayStartCoord[1] / 128)][Math.floor(rayStartCoord[0] / 128)];

    // Passes the ray with full brightness if it's on a grass tile
    if (initTile >= 950) {
        return lightIntensity;
    }

    // Fails the ray if it's too far for light to travel
    if (castStepLen * resolutionOffset > lightIntensity) {
        return 0;
    }

    // Passes the ray if it is targeting a tile with a wall on it which is within the player's view distance
    if (initTile != 0 && castStepLen < viewBubble / resolutionOffset) {
        return lightIntensity - castStepLen * resolutionOffset;
    }

    // Check for a wall in the path of the ray
    var currentStepCoords = [rayStartCoord[0], rayStartCoord[1]];
    var currentStep = 0;
    var xStepDist = (playerCoord[0] - rayStartCoord[0]) / castStepLen;
    var yStepDist = (playerCoord[1] - rayStartCoord[1]) / castStepLen;

    var prevTileHitX = -1;
    var prevTileHitY = -1;

    // Step through the path of the array, checking each tile it crosses to see if it's solid
    while (currentStep != castStepLen) { 
        var tileHitX = Math.floor(currentStepCoords[1] / 128);
        var tileHitY = Math.floor(currentStepCoords[0] / 128);

        if (tileHitX == prevTileHitX && tileHitY == prevTileHitY) {
            currentStepCoords[0] += xStepDist;
            currentStepCoords[1] += yStepDist;
            currentStep++;
            continue;
        } else {
            prevTileHitX = tileHitX;
            prevTileHitY = tileHitY;
        }

        var tileHit = worldTiles[tileHitX][tileHitY];

        // If the tile we crossed is solid, we fail the ray
        if (tileHit == 1) {
            return 0;
        } else if (tileHit > 0) {
            return (lightIntensity*(1-tileHit)) - castStepLen * resolutionOffset;
        }

        currentStepCoords[0] += xStepDist;
        currentStepCoords[1] += yStepDist;
        currentStep++;
    }

    // The ray passed all checks, 
    return lightIntensity - castStepLen * resolutionOffset;
}

var bakedCastResults = [];
var solidTileMap = [];

// This function is called every frame, and runs all lighting code
function calculateLighting() {
    if (enableDynamicLighting) {
        // Make sure the light mask is correctly positioned
        if (typeof maskMap != 'undefined') {
            maskMap.reposition();
        }

        // To improve performance, the player can choose to only re-calculate lighting every n frames
        if (lightSkipFrameCounter >= lightSkipFrames) {
            lightSkipFrameCounter = 0;
        } else {
            lightSkipFrameCounter++;
            return;
        }

        var lightCalcStartTime = Date.now();

        // If we don't have a mask map setup yet we need to setup all the tools we use for realtime lighting. This means we are generating a mask map, creating the GPU kernels we need, and run the raytracing for all baked lights
        if (typeof maskMap == 'undefined') {
            log("Setting up lighting mask")

            maskMap = new lightMaskMap(Math.floor(2560 / lightSettings.resolution), Math.floor(1440 / lightSettings.resolution), lightSettings.resolution, spotlightGroup);

            // Convert level map ground layer - currentSeed is referring to the current level
            var currentLightingSeed = currentSeed; 
            
            // The escape bay has a weird exception due to the way that the early versions of the game tracked save data, so we need to account for it here
            if (currentLightingSeed == 'escapeBayPost') {
                currentLightingSeed = 'escapeBay';
            }

            // The solidTileMap tracks how much light each tile blocks, on a scale from 0-1. Here we use the map geometry data to generate the initial state of the solidTileMap
            solidTileMap = [];
            for (var i = 0; i < tileMapData[currentLightingSeed].ground.length; i++) {
                solidTileMap.push([]);
                for (var j = 0; j < tileMapData[currentLightingSeed].ground[0].length; j++) {
                    for (var k = 0; k < lightBlockingTiles.length; k++) {
                        if ((lightBlockingTiles[k][0] <= tileMapData[currentLightingSeed].ground[i][j] && lightBlockingTiles[k][1] >= tileMapData[currentLightingSeed].ground[i][j])) {
                            solidTileMap[i][j] = 1; // 1 denotes a solid tile
                            break;
                        } else {
                            solidTileMap[i][j] = 0;
                            // break;
                        }
                    }
                }
            }

            // Create a GPU kernel from the raytraceBaseFunction that we will use to raytrace dynamic lights
            realtimeTraceRays = gpu.createKernel(raytraceBaseFunction);

            // Realtime trace rays only traces within the current screen space, so we know the output size will match the mask map's size
            realtimeTraceRays.setOutput([maskMap.height, maskMap.width]);

            // This GPU kernel is used for static lights
            bakedTraceRays = gpu.createKernel(raytraceBaseFunction);
            // Baked trace rays traces the entire level, so the output size is much larger
            bakedTraceRays.setOutput([Math.floor(solidTileMap.length * 128 / maskMap.resolution), Math.floor(solidTileMap[0].length * 128 / maskMap.resolution)]);
            bakedTraceRays.returnType = realtimeTraceRays.returnType
            bakedTraceRays.argumentTypes = realtimeTraceRays.argumentTypes

            // Now that we have the kernel setup, we can run the raytrace for all baked lights, and store the data for later
            bakedCastResults = []; // We clear out these arrays to make sure that we don't leak memory
            combinedBakedCastResults = [];
            bakedLightVals = [];
            if (bakedLights.length != 0) {
                for (var i = 0; i < bakedLights.length; i++) {
                    bakedCastResults.push(
                        bakedTraceRays(solidTileMap, maskMap.resolution, [bakedLights[i].x, bakedLights[i].y], [0, 0], bakedLights[i].brightness, lightSettings.viewDist)
                    );
                }

                for (var i = 0; i < bakedCastResults[0].length; i++) {
                    combinedBakedCastResults.push([]);
                    for (var j = 0; j < bakedCastResults[0][0].length; j++) {
                        combinedBakedCastResults[i][j] = 0;
                    }
                }

                for (var k = 0; k < bakedCastResults.length; k++) {
                    for (var i = 0; i < combinedBakedCastResults.length; i++) {
                        for (var j = 1; j < combinedBakedCastResults[0].length; j++) {
                            combinedBakedCastResults[i][j] += bakedCastResults[k][i][j];
                        }
                    }
                }

                for (var i = 0; i < maskMap.width; i++) {
                    bakedLightVals.push([]);
                }
            }

            // Before we continue calculating lighting, we just clear out all the arrays to make sure they are in their correct initial states 
            playerCastResults = [];
            for (var i = 0; i < maskMap.width; i++) {
                playerCastResults.push([]);
                for (var j = 0; j < maskMap.height; j++) {
                    playerCastResults[i][j] = 0;
                }
            }

            allCastResults = [];

            finalPixelVals = [];
            for (var i = 0; i < maskMap.width; i++) {
                finalPixelVals.push([]);
                for (var j = 0; j < maskMap.height; j++) {
                    finalPixelVals[i][j] = 0;
                }
            }
        }

        // Run raycasts for the player
        var rayCastStartTime = Date.now();
        playerCastResults = realtimeTraceRays(solidTileMap, maskMap.resolution, [player.x, player.y + 32], [game.camera.x, game.camera.y], lightSettings.brightness, lightSettings.viewDist);

        // If there are baked lights in the level, we grab the data for those for the current camera position
        if (bakedLights.length != 0) {
            var maskMapCameraCoords = [Math.floor(game.camera.x / maskMap.resolution), Math.floor(game.camera.y / maskMap.resolution)];
            for (var i = maskMapCameraCoords[0]; i < maskMap.width + maskMapCameraCoords[0]; i++) {
                for (var j = maskMapCameraCoords[1]; j < maskMap.height + maskMapCameraCoords[1]; j++) {
                    if (i < combinedBakedCastResults.length && j < combinedBakedCastResults[0].length && typeof combinedBakedCastResults[i] != 'undefined' && typeof combinedBakedCastResults[i][j] != 'undefined') {
                        bakedLightVals[i - maskMapCameraCoords[0]][j - maskMapCameraCoords[1]] = combinedBakedCastResults[i][j];
                    } else {
                        bakedLightVals[i - maskMapCameraCoords[0]][j - maskMapCameraCoords[1]] = 0;
                    }
                }
            }
        }

        // Now we mix all the raycast results into one array
        allCastResults = [];
        if (bakedLights.length != 0 && lightSettings.showBakedLights) {
            allCastResults.push(bakedLightVals);
        }
        allCastResults.push(playerCastResults);

        // While the game is in debug mode we add a dynamic light to the mouse cursor
        if (debugMode) {
            allCastResults.push(realtimeTraceRays(solidTileMap, maskMap.resolution, [game.input.worldX, game.input.worldY + 32], [game.camera.x, game.camera.y], 20, lightSettings.viewDist));
        }

        // If the player enabled other networked players to cast light, we run raycasts for them as well
        if (serverEnabled && networkPlayersCastLight) {
            for (var i = 0; i < playerSprites.length; i++) {
                // if (playerSprites[i].data != playerId) {
                    allCastResults.push(realtimeTraceRays(solidTileMap, maskMap.resolution, [playerSprites[i].x, playerSprites[i].y + 32], [game.camera.x, game.camera.y], 15, lightSettings.viewDist));
                // }
            }
        }

        var rayCastEndTime = Date.now();
        rayCastTime = rayCastEndTime - rayCastStartTime;

        // Now that we have all the raycast data together, we can process and render it
        processRayCast(allCastResults);

        castProcessStartTime = Date.now();

        renderPixels(finalPixelVals);

        var castProcessEndTime = Date.now();
        castProcessTime = castProcessEndTime - castProcessStartTime;
        var lightCalcEndTime = Date.now();
        lightCalcTime = lightCalcEndTime - lightCalcStartTime;

        // console.log(rayCastTime + "\n" + castProcessTime + "\n" + lightCalcTime);
    } else {
        // If we're running with the game's static lighting setting, all we have to do is update the spotlight's position
        spotlight.scale.setTo(lightSettings.brightness / 10, lightSettings.brightness / 10);
        spotlight.centerX = player.x;
        spotlight.centerY = player.y;
    }
}
var lightCalcTime;

// Does anti-aliasing if enabled and processes raycast data into alpha values
function processRayCast(rawCastData) {
    for (var i = 1; i < rawCastData[0].length-1; i++) {
        for (var j = 1; j < rawCastData[0][0].length-1; j++) {

            var lightBrightness = 0;
            for (var k = 0; k < rawCastData.length; k++) {
                if (lightSettings.blend) {
                    lightBrightness +=
                        (rawCastData[k][i - 1][j - 1])
                        + (rawCastData[k][i][j - 1])
                        + (rawCastData[k][i + 1][j - 1])
                        + (rawCastData[k][i - 1][j]) 
                        + (rawCastData[k][i][j] * 2) 
                        + (rawCastData[k][i + 1][j])
                        + (rawCastData[k][i - 1][j + 1]) 
                        + (rawCastData[k][i][j + 1]) 
                        + (rawCastData[k][i + 1][j + 1]);
                } else {
                    if (rawCastData[k][i][j] > 0) {
                        lightBrightness += rawCastData[k][i][j] * 10
                    }
                }
            }
            
            finalPixelVals[i][j] = 255 - lightBrightness;
        }
    }
}

// Renders the image data into a PIXI texture and loads that onto the mask sprite
function renderPixels(pixelVals) {
    var imgDataIndex = 0;
    for (var i = 0; i < pixelVals[0].length; i++) {
        for (var j = 0; j < pixelVals.length; j++) {
            maskMap.imgData.data[imgDataIndex + 3] = pixelVals[j][i] * lightSettings.shadowDarknessFactor;

            imgDataIndex += 4;
        }
    }
    maskMap.ctx.putImageData(maskMap.imgData, 0, 0);
    maskMap.sprite.loadTexture(new PIXI.Texture.fromCanvas(maskMap.canvas, PIXI.scaleModes.DEFAULT));
}

function updateShadowRes(res) {
    if (typeof maskMap != 'undefined') {
        maskMap.destroy();
    }
    maskMap = undefined;

    lightSettings.resolution = res;
}

// Source for this Function: https://stackoverflow.com/a/697841/10168000
function decimalToHexString(number) {
    if (number < 0) {
        number = 0xFFFFFFFF + number + 1;
    }

    return number.toString(16).toUpperCase();
}

/*
 This is just some left over code from old an lighting implementation where we tried to cut out parts of the spotlight where light was able to reach.

var maskPolygon = new Phaser.Polygon(
    [player.x - maskMap.width * maskMap.resolution, player.y - maskMap.height * maskMap.resolution],
    [player.x - maskMap.width * maskMap.resolution, player.y + maskMap.height * maskMap.resolution],
    [player.x + maskMap.width * maskMap.resolution, player.y + maskMap.height * maskMap.resolution],
    [player.x + maskMap.width * maskMap.resolution, player.y - maskMap.height * maskMap.resolution]
);

 var graphics = game.add.graphics(0, 0);
 graphics.beginFill(0xFF33ff);
 lightMask = graphics.drawPolygon(maskPolygon.points);
 spotlight.mask = lightMask;

 That sort of worked, but it didn't allow us to have partially opaque shadows. It also was not very performant.

 In other implementations we tried 
- Drawing shadows with a black polygon - Had similar problems to the above
- Having each shadow pixel be its own individual sprite - That performed terribly
- Using a tilemap with several tiles with different opacity - This also wasn't very performant

We also originally tried to run the raytracing on the CPU using normal JS, but JS can't be multi-threaded so that ran terribly (A cinematic and buttery-smooth 4 FPS was our peak)
*/