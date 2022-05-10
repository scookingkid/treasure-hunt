import 'bootstrap/dist/css/bootstrap.min.css';
import '@arcgis/core/assets/esri/css/main.css';
import './viewfinder.css';
import './App.css';
import { parseArgs, fetchFeatures, getImageURL } from './Utils';
import {useEffect, useState, useRef} from "react";
import {THMap} from './components/THMap';
import { PhotoCredits } from './components/PhotoCredits';
import { Intro } from './components/Intro';

function App() {

  const [config, setConfig] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [hideInstructions, setHideInstructions] = useState(false);

  const _records = useRef([]);

  useEffect(
    () => {
      document.addEventListener(
        "keydown", 
        (event) => {if (event.keyCode === 27) {setHideInstructions(true);}}
      );
      (async () => {
        const response = await fetch("./config.json");
        const json = await response.json();
        const protoConfig = json.filter(
          (value)=>value.path === "heritage-sites"
        ).shift();
        const args = parseArgs();
        let editionConfig = args.edition && 
          json.filter((value)=>value.path === args.edition).shift();
        setConfig(
          !editionConfig ? 
          protoConfig : 
          {...protoConfig, ...editionConfig}
        );
      })();      
    },
    []
  );

  useEffect(
    ()=> {
      if (config) {
        (async () => {
          const features = await fetchFeatures(config.serviceURL);
          _records.current = 
            await Promise.all(
              features.map(
                async (feature)=>{
                  return {
                    ...feature.attributes, 
                    imageURL: await getImageURL(
                      config.serviceURL, 
                      feature.attributes.objectid
                    ),
                    solved: false,
                    hintActivated: false,
                    x: feature.geometry.x,
                    y: feature.geometry.y  
                  }
                }
              ) // features.map           
            ) // await Promise.all
          setSelectedQuestion(_records.current.slice().shift())
        })();
      }
    },
    [config]
  )

  const doNext = () => {
    const idx = findItemIndex(selectedQuestion.objectid);
    setSelectedQuestion(
      idx < _records.current.length - 1 ? 
      _records.current[idx+1] :
      selectedQuestion 
    );
  }

  const doPrev = () => {
    const idx = findItemIndex(selectedQuestion.objectid);
    setSelectedQuestion(
      idx !== 0 ? 
      _records.current[idx-1] :
      selectedQuestion 
    );
  }

  const showCertificate = () => {
    window.open("../certificate.pdf", "_blank");
  }

  const dismissInstructions = () => {
    setHideInstructions(true);
  }

  const markSolved = (objectid) => {
    const idx = findItemIndex(objectid);
    const question = _records.current[idx]
    const marked = {...question, solved: true};
    _records.current.splice(idx, 1, marked);
    setSelectedQuestion(marked);
  }

  const markHintActivated = (objectid) => {
    const idx = findItemIndex(objectid);
    const question = _records.current[idx]
    const marked = {...question, hintActivated: true};
    _records.current.splice(idx, 1, marked);
    setSelectedQuestion(marked);
  }

  const findItemIndex = (objectid) => {
    return _records.current.findIndex((element)=>element.objectid === objectid)
  }

  return (

    <div className="App vh-100 p-md-3 p-sm-2 p-1 d-flex flex-column">
      {
      config && 
      <>

        <header>
          <h1 className='h4 ms-3 border-bottom border-bottom-1'>Treasure Hunt: {config.title}</h1>
        </header>

        <section id="main" 
                className="flex-grow-1 d-flex flex-column flex-sm-row-reverse position-relative overflow-hidden">

          {
          !hideInstructions && selectedQuestion &&
          <Intro className="position-absolute w-100 h-100"
                style={{zIndex: 2000, backgroundColor: "rgba(0,0,0,0.6)"}} 
                title={config.title} 
                description={config.description}
                instructions={config.instructions} 
                hero={selectedQuestion.imageURL}
                onDismiss={()=>dismissInstructions()}></Intro>
          }

          {
          selectedQuestion && 
          <THMap id="map" 
                className="flex-grow-1 flex-shrink-0"
                homeCenter={config.homeCenter}
                homeZoom={config.homeZoom}
                minZoom={config.minZoom}
                maxZoom={config.maxZoom}
                scaleDenominator={config.scaleDenominator}
                selected={selectedQuestion}
                onSolve={(objectid)=>markSolved(objectid)}></THMap>
          }

          {
          selectedQuestion &&
          <div id="controls"
                className="flex-sm-grow-1 flex-grow-1 align-self-center align-self-sm-stretch overflow-hidden d-flex flex-column p-3 pt-2 pt-sm-0  pb-0 align-items-center" 
                style={{maxWidth: "600px"}}>
            <div className="card flex-grow-1 overflow-hidden">
              <div className="card-header">Question #{findItemIndex(selectedQuestion.objectid)+1}</div>
              <img src={selectedQuestion.imageURL} className="card-img-top align-self-center mt-2" alt="..." style={{height:"45%", maxHeight: "350px", width:"auto"}}></img>              
              <div className="card-body overflow-auto d-flex flex-column"
                    style={{
                      backgroundImage: `url(${selectedQuestion.imageURL})`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center"      
                    }}>
                  <PhotoCredits 
                    attribution={selectedQuestion.image_attribution}
                    sourceReferenceURL={selectedQuestion.image_source_reference_page}
                    license={selectedQuestion.image_license}
                    licenseReferenceURL={selectedQuestion.image_license_reference_page}
                    className='small'
                    style={{
                      marginTop: "-10px", 
                      marginBottom: "15px"}}></PhotoCredits>
                  {
                  selectedQuestion.solved &&
                  <div className="alert alert-success" 
                      dangerouslySetInnerHTML={{__html: "<strong>Answer:</strong> "+selectedQuestion.exclamation}}></div>
                  }
                  {
                  selectedQuestion.hintActivated &&
                  <div className={`alert ${selectedQuestion.solved ? "alert-secondary" : "alert-info"}`} 
                      dangerouslySetInnerHTML={{__html: "<strong>Hint:</strong> "+selectedQuestion.hint}}></div>
                  }
                  <div className={`alert ${selectedQuestion.hintActivated || selectedQuestion.solved ? "alert-secondary" : "alert-info"}`} 
                      dangerouslySetInnerHTML={{__html: "<strong>Question:</strong> "+selectedQuestion.prompt}}></div>                                  
              </div>
            </div>
            <div className="w-100 d-flex mt-2 justify-content-between ms-3 me-3 mb-1">
              <button className={`btn ${findItemIndex(selectedQuestion.objectid) === 0 ? "btn-outline-secondary" : "btn-outline-dark"}`}
                      disabled={findItemIndex(selectedQuestion.objectid) === 0}
                      onClick={doPrev}>Prev</button>
              {
              !selectedQuestion.hintActivated && !selectedQuestion.solved &&
              <button className="btn btn-outline-dark" 
                      onClick={()=>markHintActivated(selectedQuestion.objectid)}>Psst...need a hint?</button>
              }
              {
              findItemIndex(selectedQuestion.objectid) < _records.current.length - 1 &&
              <button className={`btn ${selectedQuestion.solved ? "btn-primary" : "btn-outline-secondary"}`} 
                      disabled={!selectedQuestion.solved || findItemIndex(selectedQuestion.objectid) === _records.current.length - 1}
                      onClick={doNext}>Next</button>
              }
              {
              findItemIndex(selectedQuestion.objectid) === _records.current.length - 1 &&
              <button className="btn btn-primary"
                      disabled={_records.current.filter((question)=>question.solved).length < _records.current.length} 
                      onClick={showCertificate}>Claim. Your. PRIZE!!!</button>
              }

            </div>
          </div>
          }


        </section>


        <footer className="d-flex justify-content-end small pt-1"></footer>
      </>
      }
    </div>
  );
}

export default App;