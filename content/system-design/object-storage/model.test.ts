import { formatOutput } from "@tintelix/schema/format";
import { uploadModel } from "./model";

const run = (extra: Record<string, number>) => uploadModel.run({ ...uploadModel.defaults, ...extra }) as Record<string, number>;
const show = (extra: Record<string, number>, name: string) => formatOutput(name, run(extra)[name]!);

describe("object storage model", () => {
  it("uploads through the app: each holds a worker for the whole slow transfer", () => {
    expect(show({}, "uploadSec")).toBe("8 s");
    expect(show({}, "busyWorkers")).toBe("1,600");
    expect(show({}, "serversNeeded")).toBe("16");
    expect(show({}, "appGbps")).toBe("8");
  });

  it("a signed URL: the app only signs, the phone uploads straight to storage", () => {
    expect(show({ direct: 1 }, "busyWorkers")).toBe("1");
    expect(show({ direct: 1 }, "serversNeeded")).toBe("1");
    expect(show({ direct: 1 }, "appGbps")).toBe("0");
    expect(show({ direct: 1 }, "storeGbps")).toBe("8");
  });

  it("a big upload that fails at 90% starts over; multipart redoes one part", () => {
    expect(show({}, "bigSec")).toBe("53 min");
    expect(show({}, "redoMb")).toBe("1,800");
    expect(show({}, "redoSec")).toBe("48 min");
    expect(show({ multipart: 1 }, "redoMb")).toBe("100");
    expect(show({ multipart: 1 }, "redoSec")).toBe("3 min");
    expect(run({ multipart: 1 }).parts).toBe(20);
    expect(show({ multipart: 1, partMb: 10 }, "redoSec")).toBe("16 s");
  });
});
