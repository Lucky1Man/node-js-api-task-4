import bodyParser from "body-parser";
import chai from "chai";
import chaiHttp from "chai-http";
import express from "express";
import mongoose from "mongoose";
import sinon from "sinon";
import { dateInputMiddleware } from "src/middlewares";
import Testimony from "src/model/testimony";
import routers from "src/routers/testimonies";
import * as executionFactService from "src/services/execution-fact";
import * as witnessService from "src/services/witness";
import mongoSetup from "../mongoSetup";

const { expect } = chai;

chai.use(chaiHttp);
chai.should();

const sandbox = sinon.createSandbox();

const app = express();

app.use(bodyParser.json({ limit: "1mb" }));

app.use(dateInputMiddleware);

app.use("/", routers);

// !!!!!!!!!!!! DO NOT CHANGE ORDER BECAUSE IT MATTERS IN TESTS !!!!!!!!!!!
const testTestimonies = [
  new Testimony({
    witnessId: "9fcb46b8-2d23-40d9-8b21-8678bacc563d",
    executionFactId: "e32db94c-f2ca-4804-a7d8-90d35f65b57b",
    timestamp: "2004-01-01T00:00:00Z",
  }),
  new Testimony({
    witnessId: "9fcb46b8-2d23-40d9-8b21-8678bacc563d",
    executionFactId: "e32db94c-f2ca-4804-a7d8-90d35f65b57b",
    timestamp: "2005-01-01T00:00:00Z",
  }),
  new Testimony({
    witnessId: "9fcb46b8-2d23-40d9-8b21-8678bacc563d",
    executionFactId: "e32db94c-f2ca-4804-a7d8-90d35f65b57b",
    timestamp: "2006-01-01T00:00:00Z",
  }),
];

describe("Testimonies controller", () => {
  before(async () => {
    await mongoSetup;
  });

  const executionFactsServiceStub = sandbox.stub(
    executionFactService,
    "getExecutionFactById"
  );

  const witnessServiceStub = sandbox.stub(witnessService, "getWitnessById");

  afterEach(async () => {
    sandbox.resetHistory();
    await mongoose.connection.db.dropDatabase();
  });

  it("must save given testimony", (done) => {
    const witnessId = "9fcb46b8-2d23-40d9-8b21-8678bacc563d";
    const executionFactId = "e32db94c-f2ca-4804-a7d8-90d35f65b57b";
    witnessServiceStub.withArgs(witnessId).resolves({ id: witnessId });
    executionFactsServiceStub
      .withArgs(executionFactId)
      .resolves({ id: executionFactId });
    chai
      .request(app)
      .post("")
      .send({
        witnessId: witnessId,
        executionFactId: executionFactId,
        timestamp: "2004-01-01T00:00:00Z",
      })
      .end(async (_, res) => {
        try {
          res.should.have.status(201);
          const inDb = await Testimony.findOne();
          expect(await Testimony.countDocuments()).to.equal(1);
          expect(inDb).to.exist;
          expect(inDb?._id.toString()).to.equal(res.body.id);
          expect(inDb?.executionFactId.toString()).to.equal(executionFactId);
          expect(inDb?.witnessId.toString()).to.equal(witnessId);
          done();
        } catch (ex) {
          done(ex);
        }
      });
  });

  [
    {
      data: {
        witnessId: "123",
        executionFactId: "e32db94c-f2ca-4804-a7d8-90d35f65b57b",
        timestamp: "2004-01-01T00:00:00Z",
      },
      expectedCode: 400,
      expectedMessage: "Given invalid witness id: 123.",
      beforeTestAction: () => {
        return;
      },
    },
    {
      data: {
        witnessId: "9fcb46b8-2d23-40d9-8b21-8678bacc563d",
        executionFactId: "123",
        timestamp: "2004-01-01T00:00:00Z",
      },
      expectedCode: 400,
      expectedMessage: "Given invalid execution fact id: 123.",
      beforeTestAction: (data: any) => {
        witnessServiceStub
          .withArgs(data.witnessId)
          .resolves({ id: data.witnessId });
      },
    },
    {
      data: {
        witnessId: "9fcb46b8-2d23-40d9-8b21-8678bacc563d",
        executionFactId: "e32db94c-f2ca-4804-a7d8-90d35f65b57b",
        timestamp: "9999-01-01T00:00:00Z",
      },
      expectedCode: 400,
      expectedMessage: "can not be in the future",
      beforeTestAction: () => {
        return;
      },
    },
    {
      data: {
        witnessId: "9fcb46b8-2d23-40d9-8b21-8678bacc563d",
        executionFactId: "e32db94c-f2ca-4804-a7d8-90d35f65b57b",
        timestamp: "2004-01-01T00:00:00Z",
      },
      expectedCode: 404,
      expectedMessage:
        "Given witness id: 9fcb46b8-2d23-40d9-8b21-8678bacc563d, does not exist.",
      beforeTestAction: (data: any) => {
        witnessServiceStub.withArgs(data.witnessId).resolves({ id: "" });
      },
    },
    {
      data: {
        witnessId: "9fcb46b8-2d23-40d9-8b21-8678bacc563d",
        executionFactId: "e32db94c-f2ca-4804-a7d8-90d35f65b57b",
        timestamp: "2004-01-01T00:00:00Z",
      },
      expectedCode: 404,
      expectedMessage:
        "Given execution fact id: e32db94c-f2ca-4804-a7d8-90d35f65b57b, does not exist.",
      beforeTestAction: (data: any) => {
        witnessServiceStub
          .withArgs(data.witnessId)
          .resolves({ id: data.witnessId });
        executionFactsServiceStub
          .withArgs(data.executionFactId)
          .resolves({ id: "" });
      },
    },
  ].forEach((testCase) => {
    it(`must return error if invalid input: ${testCase.expectedMessage}`, (done) => {
      testCase.beforeTestAction(testCase.data);
      const witnessId = testCase.data.witnessId;
      const executionFactId = testCase.data.executionFactId;
      chai
        .request(app)
        .post("")
        .send({
          witnessId: witnessId,
          executionFactId: executionFactId,
          timestamp: testCase.data.timestamp,
        })
        .end(async (_, res) => {
          try {
            res.should.have.status(testCase.expectedCode);
            expect(res.body.message).to.include(testCase.expectedMessage);
            expect(await Testimony.countDocuments()).to.equal(0);
            done();
          } catch (ex) {
            done(ex);
          }
        });
    });
  });

  it("must return data corresponding to filter", (done) => {
    const expected = testTestimonies.at(1);
    Promise.all(testTestimonies.map((testimony) => testimony.save())).then(
      () => {
        const executionFactId = "e32db94c-f2ca-4804-a7d8-90d35f65b57b";
        chai
          .request(app)
          .get("")
          .query({
            executionFactId: executionFactId,
            size: 1,
            from: 1,
          })
          .end(async (_, res) => {
            try {
              expect(res.body.length).to.equal(1);
              const result = res.body.at(0);
              expect(result).to.exist;
              expect(result._id).to.equal(expected?._id.toString());
              expect(result.executionFactId).to.equal(
                expected?.executionFactId
              );
              expect(result.witnessId).to.equal(expected?.witnessId);
              expect(result.timestamp).to.equal(expected?.timestamp.toISOString());
              expect(await Testimony.countDocuments()).to.equal(3);
              done();
            } catch (ex) {
              done(ex);
            }
          });
      }
    );
  });
});
