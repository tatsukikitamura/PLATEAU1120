import { runAndLoadEvacuationSimulation } from "plateau/cesium/simulation_loader";

export class SimulationManager {
  constructor(viewer) {
    this.viewer = viewer;
    this.current = null;
  }

  async runEvacuation(params = {}) {
    this.clear();
    this.current = await runAndLoadEvacuationSimulation(this.viewer, params);
    return this.current;
  }

  clear() {
    try {
      if (this.current && this.current.dataSource) {
        this.viewer.dataSources.remove(this.current.dataSource, true);
      }
    } catch (_) {}
    this.current = null;
  }
}


