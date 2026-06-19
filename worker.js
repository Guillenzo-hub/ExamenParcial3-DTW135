self.onmessage = function (e) {
    const { type, data } = e.data;

    if (type === 'level4') {
        processLevel4(data);
    } else if (type === 'level5') {
        processLevel5(data);
    }
};

function processLevel4(data) {
    const total = data.length;
    let sumTemp = 0, sumHum = 0;
    let maxTemp = -Infinity, maxHum = -Infinity;
    let minTemp = Infinity, minHum = Infinity;
    let index = 0;
    const batchSize = 500;

    function processBatch() {
        const limit = Math.min(index + batchSize, total);

        for (; index < limit; index++) {
            const d = data[index];
            sumTemp += d.temperature;
            sumHum += d.humidity;
            if (d.temperature > maxTemp) maxTemp = d.temperature;
            if (d.humidity > maxHum) maxHum = d.humidity;
            if (d.temperature < minTemp) minTemp = d.temperature;
            if (d.humidity < minHum) minHum = d.humidity;
        }

        self.postMessage({
            type: 'progress',
            progress: Math.round((index / total) * 100)
        });

        if (index < total) {
            setTimeout(processBatch, 10);
            return;
        }

        self.postMessage({
            type: 'result',
            stats: {
                avgTemp: (sumTemp / total).toFixed(2),
                avgHum: (sumHum / total).toFixed(2),
                maxTemp: maxTemp.toFixed(2),
                maxHum: maxHum.toFixed(2),
                minTemp: minTemp.toFixed(2),
                minHum: minHum.toFixed(2)
            }
        });
    }

    processBatch();
}

function processLevel5(data) {
    const total = data.length;
    let sumTemp = 0, sumHum = 0, sumPres = 0;
    let sumTempSq = 0, sumHumSq = 0, sumPresSq = 0;
    let maxTemp = -Infinity, maxHum = -Infinity, maxPres = -Infinity;
    let minTemp = Infinity, minHum = Infinity, minPres = Infinity;
    let validCount = 0;
    let validTemps = [];
    let validPressures = [];
    let invalidTemp = 0, invalidHum = 0, invalidPres = 0;

    const tempBins = [-Infinity, 0, 10, 15, 20, 25, 30, 35, Infinity];
    const dist = new Array(tempBins.length - 1).fill(0);

    const scatterSample = [];
    const sampleRate = Math.max(1, Math.floor(total / 2000));

    for (let i = 0; i < total; i++) {
        if (i % 2000 === 0) {
            self.postMessage({
                type: 'progress',
                progress: Math.round((i / total) * 100)
            });
        }

        const d = data[i];
        const tempOk = d.temperature >= 0;
        const humOk = d.humidity >= 0;
        const presOk = d.pressure >= 0;
        const valid = tempOk && humOk && presOk;

        if (valid) {
            sumTemp += d.temperature;
            sumHum += d.humidity;
            sumPres += d.pressure;
            sumTempSq += d.temperature * d.temperature;
            sumHumSq += d.humidity * d.humidity;
            sumPresSq += d.pressure * d.pressure;

            if (d.temperature > maxTemp) maxTemp = d.temperature;
            if (d.humidity > maxHum) maxHum = d.humidity;
            if (d.pressure > maxPres) maxPres = d.pressure;
            if (d.temperature < minTemp) minTemp = d.temperature;
            if (d.humidity < minHum) minHum = d.humidity;
            if (d.pressure < minPres) minPres = d.pressure;

            validCount++;
            validTemps.push({ val: d.temperature, idx: i });
            validPressures.push({ val: d.pressure, idx: i });

            for (let b = 0; b < tempBins.length - 1; b++) {
                if (d.temperature >= tempBins[b] && d.temperature < tempBins[b + 1]) {
                    dist[b]++;
                    break;
                }
            }
        } else {
            if (!tempOk) invalidTemp++;
            if (!humOk) invalidHum++;
            if (!presOk) invalidPres++;
        }

        if (i % sampleRate === 0 && scatterSample.length < 2000) {
            scatterSample.push({ t: d.temperature, h: d.humidity, v: valid ? 1 : 0 });
        }
    }

    validTemps.sort((a, b) => b.val - a.val);
    validPressures.sort((a, b) => b.val - a.val);

    const mid = Math.floor(validCount / 2);
    const medianTemp = validCount > 0 ? validTemps[mid].val : 0;

    const avgTemp = sumTemp / validCount;
    const avgHum = sumHum / validCount;
    const avgPres = sumPres / validCount;

    const varianceTemp = sumTempSq / validCount - avgTemp * avgTemp;
    const varianceHum = sumHumSq / validCount - avgHum * avgHum;
    const variancePres = sumPresSq / validCount - avgPres * avgPres;

    const stdDevTemp = varianceTemp > 0 ? Math.sqrt(varianceTemp) : 0;
    const stdDevHum = varianceHum > 0 ? Math.sqrt(varianceHum) : 0;
    const stdDevPres = variancePres > 0 ? Math.sqrt(variancePres) : 0;

    const top10Temps = validTemps.slice(0, 10).map(function(t) { return t.val.toFixed(2); });
    const top10Press = validPressures.slice(0, 10).map(function(p) { return p.val.toFixed(2); });

    var sampleRecords = [];
    for (var i = 0; i < Math.min(15, validCount); i++) {
        var idx = validTemps[i].idx;
        sampleRecords.push({
            t: data[idx].temperature.toFixed(2),
            h: data[idx].humidity.toFixed(2),
            p: data[idx].pressure.toFixed(2)
        });
    }

    self.postMessage({
        type: 'result',
        stats: {
            avgTemp: avgTemp.toFixed(2),
            avgHum: avgHum.toFixed(2),
            avgPres: avgPres.toFixed(2),
            medianTemp: medianTemp.toFixed(2),
            stdDevTemp: stdDevTemp.toFixed(2),
            stdDevHum: stdDevHum.toFixed(2),
            stdDevPres: stdDevPres.toFixed(2),
            maxTemp: maxTemp.toFixed(2),
            maxHum: maxHum.toFixed(2),
            maxPres: maxPres.toFixed(2),
            minTemp: minTemp.toFixed(2),
            minHum: minHum.toFixed(2),
            minPres: minPres.toFixed(2),
            top10Temps: top10Temps,
            top10Press: top10Press,
            validCount: validCount,
            totalCount: total,
            invalidTemp: invalidTemp,
            invalidHum: invalidHum,
            invalidPres: invalidPres,
            tempDistribution: dist,
            scatterSample: scatterSample,
            sampleRecords: sampleRecords
        }
    });
}
